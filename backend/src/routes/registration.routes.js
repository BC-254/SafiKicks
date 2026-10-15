'use strict';
/**
 * registration.routes.js — Customer registration portal endpoints.
 * Includes phone OTP verification, price indicative display, job registration,
 * and public job tracking via signed unguessable access tokens.
 */

const express = require('express');
const router = express.Router();

const db = require('../config/db');
const env = require('../config/env');
const logger = require('../utils/logger');
const { otpLimiter, registrationLimiter } = require('../middleware/rateLimiter');
const { generatePhoneSessionToken, verifyPhoneSession } = require('../middleware/auth');
const { generateAndHash, verifyOTP, otpExpiryDate } = require('../services/otp.service');
const smsService = require('../services/sms.service');
const Customer = require('../models/customer');
const Job = require('../models/job');
const ServiceCatalog = require('../models/serviceCatalog');
const { logEvent, getJobTimeline } = require('../models/auditLog');
const { AUDIT_EVENT, CHANNEL } = require('../config/constants');

// Helper to normalise East African / Kenyan phone numbers to E.164
const normalisePhone = (raw) => {
  let p = String(raw || '').replace(/[\s\-().]/g, '');
  if (p.startsWith('07')) p = '+254' + p.slice(1);
  if (p.startsWith('01')) p = '+254' + p.slice(1);
  if (p.startsWith('7') && p.length === 9) p = '+254' + p;
  if (p.startsWith('1') && p.length === 9) p = '+254' + p;
  if (p.startsWith('254') && !p.startsWith('+')) p = '+' + p;
  return p;
};

// ── 1. POST /api/register/verify-phone ─────────────────────────
// Step 1: Send SMS OTP to verify phone ownership
router.post('/verify-phone', otpLimiter, async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    const formattedPhone = normalisePhone(phone);
    if (!/^\+254\d{9}$/.test(formattedPhone)) {
      return res.status(400).json({ error: 'Please enter a valid Kenyan phone number (+254...)' });
    }

    const { code, hash } = await generateAndHash();
    const expiresAt = otpExpiryDate();

    // Invalidate previous unused codes for this phone
    await db.query(
      `UPDATE phone_verifications SET used = TRUE WHERE phone = $1 AND used = FALSE`,
      [formattedPhone]
    );

    await db.query(
      `INSERT INTO phone_verifications (phone, code_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [formattedPhone, hash, expiresAt]
    );

    await smsService.sendPhoneVerification(formattedPhone, code);

    logger.info('Phone verification code dispatched', { phone: formattedPhone });

    res.json({
      message: 'Verification code sent to your phone via SMS.',
      phone: formattedPhone,
      // In development / mock mode, return code to ease local testing
      ...(env.SMS_MODE === 'mock' || !env.IS_PROD ? { devCode: code } : {}),
    });
  } catch (err) {
    next(err);
  }
});

// ── 2. POST /api/register/confirm-phone ────────────────────────
// Step 2: Validate submitted OTP and issue short-lived session token
router.post('/confirm-phone', otpLimiter, async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ error: 'Phone number and verification code are required.' });
    }

    const formattedPhone = normalisePhone(phone);

    const latest = await db.query(
      `SELECT id, code_hash, attempts, expires_at, used
       FROM phone_verifications
       WHERE phone = $1 AND used = FALSE
       ORDER BY created_at DESC
       LIMIT 1`,
      [formattedPhone]
    );

    const record = latest.rows[0];
    if (!record) {
      return res.status(400).json({ error: 'No active verification code found. Please request a new one.' });
    }

    if (new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Verification code expired. Please request a new code.' });
    }

    if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a fresh code.' });
    }

    const isValid = await verifyOTP(code, record.code_hash);
    if (!isValid) {
      await db.query(
        `UPDATE phone_verifications SET attempts = attempts + 1 WHERE id = $1`,
        [record.id]
      );
      const remaining = env.OTP_MAX_ATTEMPTS - (record.attempts + 1);
      return res.status(400).json({
        error: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      });
    }

    // Success: mark code as used
    await db.query(
      `UPDATE phone_verifications SET used = TRUE WHERE id = $1`,
      [record.id]
    );

    // Issue short-lived phone session token
    const phoneSessionToken = generatePhoneSessionToken(formattedPhone);

    logger.info('Phone number successfully verified', { phone: formattedPhone });

    res.json({
      success: true,
      phoneSessionToken,
      phone: formattedPhone,
    });
  } catch (err) {
    next(err);
  }
});

// ── 3. POST /api/register/job ──────────────────────────────────
// Step 3: Create registered job using verified phone session
router.post('/job', registrationLimiter, async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const {
      name,
      service_id,
      shoe_brand,
      shoe_color,
      notes,
      consent_given,
      phoneSessionToken: bodyToken,
    } = req.body;

    const token = (authHeader && authHeader.startsWith('Bearer '))
      ? authHeader.slice(7)
      : bodyToken;

    if (!token) {
      return res.status(401).json({ error: 'Phone verification session required to register a job.' });
    }

    let verifiedPhone;
    try {
      const decoded = verifyPhoneSession(token);
      verifiedPhone = decoded.phone;
    } catch (_) {
      return res.status(401).json({ error: 'Invalid or expired phone verification session. Please verify phone again.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    if (!service_id) {
      return res.status(400).json({ error: 'Please select a service from the catalog.' });
    }

    if (!consent_given) {
      return res.status(400).json({ error: 'Customer privacy consent is required.' });
    }

    const service = await ServiceCatalog.findById(service_id);
    if (!service || !service.active) {
      return res.status(400).json({ error: 'Selected service is invalid or unavailable.' });
    }

    // Execute transaction: create customer and job atomically
    const result = await db.withTransaction(async (client) => {
      const customer = await Customer.upsertByPhone({
        name,
        phone: verifiedPhone,
        consent_given: true,
      }, client);

      const job = await Job.createJob({
        customer_id: customer.id,
        service_id: service.id,
        shoe_brand,
        shoe_color,
        notes,
        channel: CHANNEL.SELF_REGISTERED,
      }, client);

      await logEvent({
        jobId: job.id,
        actorLabel: 'customer',
        eventType: AUDIT_EVENT.JOB_CREATED,
        newValue: {
          job_number: job.job_number,
          service: service.name,
          customer_name: customer.name,
          shoe_brand,
          shoe_color,
        },
        notes: 'Customer self-registered online with verified phone number.',
        client,
      });

      return { customer, job };
    });

    const { job } = result;

    // Send SMS with job number and unguessable tracking link
    await smsService.sendJobRegistered(verifiedPhone, job.job_number, job.access_token);

    logger.info('Job registered successfully', {
      jobNumber: job.job_number,
      phone: verifiedPhone,
      service: service.name,
    });

    res.status(201).json({
      success: true,
      message: 'Job registered successfully! Bring your shoes to the shop within 48 hours.',
      jobNumber: job.job_number,
      accessToken: job.access_token,
      trackingUrl: `/job/${job.access_token}`,
      expiresAt: job.expires_at,
    });
  } catch (err) {
    next(err);
  }
});

// ── 4. GET /api/job/:token ─────────────────────────────────────
// Public job tracking endpoint using signed unguessable access token
router.get('/job/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 32) {
      return res.status(404).json({ error: 'Invalid tracking link.' });
    }

    const job = await Job.findByAccessToken(token);
    if (!job) {
      return res.status(404).json({ error: 'Job not found. Please check your tracking link.' });
    }

    const timeline = await getJobTimeline(job.id);

    res.json({
      job,
      timeline,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
