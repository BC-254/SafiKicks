'use strict';
/**
 * pricing.routes.js — Public customer price confirmation & decline endpoints.
 * Accessed via secure unguessable 64-char hex access token sent in SMS.
 * No password login required for customer; access token authenticates the request.
 */

const express = require('express');
const router = express.Router();

const db = require('../config/db');
const logger = require('../utils/logger');
const { JOB_STATUS, AUDIT_EVENT } = require('../config/constants');
const { assertTransition } = require('../services/stateMachine');
const Job = require('../models/job');
const Price = require('../models/price');
const { logEvent } = require('../models/auditLog');

// ── 1. GET /api/job/:token/price ───────────────────────────────
// Fetch latest proposed price for customer review
router.get('/:token/price', async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 32) {
      return res.status(404).json({ error: 'Invalid tracking token.' });
    }

    const job = await Job.findByAccessToken(token);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const latestPrice = await Price.getLatestForJob(job.id);
    const canRespond = [JOB_STATUS.AWAITING_CONFIRMATION, JOB_STATUS.ON_HOLD].includes(job.status);

    res.json({
      job: {
        id: job.id,
        job_number: job.job_number,
        status: job.status,
        service_name: job.service_name,
        catalog_min_price: job.catalog_min_price,
        catalog_max_price: job.catalog_max_price,
        shoe_brand: job.shoe_brand,
        shoe_color: job.shoe_color,
      },
      price: latestPrice,
      canRespond,
    });
  } catch (err) {
    next(err);
  }
});

// ── 2. POST /api/job/:token/price/confirm ──────────────────────
// Customer approves proposed price -> status transitions to 'Started'
router.post('/:token/price/confirm', async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 32) {
      return res.status(404).json({ error: 'Invalid tracking token.' });
    }

    const job = await Job.findByAccessToken(token);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    // State machine check
    assertTransition(job.status, JOB_STATUS.STARTED, 'customer');

    const latestPrice = await Price.getLatestForJob(job.id);
    if (!latestPrice) {
      return res.status(400).json({ error: 'No price proposal found to confirm.' });
    }

    await db.withTransaction(async (client) => {
      // 1. Mark customer response as confirmed on price version
      await Price.recordCustomerResponse(
        {
          jobId: job.id,
          versionNumber: latestPrice.version_number,
          response: 'confirmed',
        },
        client
      );

      // 2. Transition job status to Started
      await client.query(
        `UPDATE jobs
         SET status = $1,
             started_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [JOB_STATUS.STARTED, job.id]
      );

      // 3. Immutable audit log
      await logEvent({
        jobId: job.id,
        actorLabel: 'customer',
        eventType: AUDIT_EVENT.PRICE_CONFIRMED,
        oldValue: { status: job.status },
        newValue: { status: JOB_STATUS.STARTED, agreed_price: latestPrice.amount },
        notes: `Customer confirmed quote of KES ${latestPrice.amount} online. Repair work authorized to proceed.`,
        client,
      });
    });

    logger.info('Customer confirmed repair price', {
      jobId: job.id,
      jobNumber: job.job_number,
      amount: latestPrice.amount,
    });

    res.json({
      success: true,
      message: 'Price confirmed! Your repair work has officially begun.',
      status: JOB_STATUS.STARTED,
      agreedPrice: latestPrice.amount,
    });
  } catch (err) {
    next(err);
  }
});

// ── 3. POST /api/job/:token/price/decline ──────────────────────
// Customer declines price proposal -> status transitions to 'Cancelled'
router.post('/:token/price/decline', async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || token.length < 32) {
      return res.status(404).json({ error: 'Invalid tracking token.' });
    }

    const job = await Job.findByAccessToken(token);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    // State machine check
    assertTransition(job.status, JOB_STATUS.CANCELLED, 'customer');

    const latestPrice = await Price.getLatestForJob(job.id);

    await db.withTransaction(async (client) => {
      if (latestPrice) {
        await Price.recordCustomerResponse(
          {
            jobId: job.id,
            versionNumber: latestPrice.version_number,
            response: 'declined',
          },
          client
        );
      }

      await client.query(
        `UPDATE jobs
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [JOB_STATUS.CANCELLED, job.id]
      );

      await logEvent({
        jobId: job.id,
        actorLabel: 'customer',
        eventType: AUDIT_EVENT.PRICE_DECLINED,
        oldValue: { status: job.status },
        newValue: { status: JOB_STATUS.CANCELLED, declined_price: latestPrice?.amount || null },
        notes: `Customer declined quote of KES ${latestPrice?.amount || 0} online. Job cancelled.`,
        client,
      });
    });

    logger.info('Customer declined price quote', {
      jobId: job.id,
      jobNumber: job.job_number,
    });

    res.json({
      success: true,
      message: 'Repair quote declined. Your job has been cancelled. Please visit our shop to collect your shoes.',
      status: JOB_STATUS.CANCELLED,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
