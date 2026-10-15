'use strict';
/**
 * payment.routes.js — Counter staff & owner payment ledger endpoints.
 *
 * Requirements:
 *  - M8-01: Record payment (cash, mpesa, card)
 *  - M8-02: Payment reversal (owner only, reason mandatory)
 *  - M8-03: Job payment ledger
 *  - M8-04: Dynamic status calculation: Unpaid, Part-paid, Paid
 *  - M8-05: Owner payment override for pickup
 */

const express = require('express');
const router = express.Router();

const db = require('../config/db');
const logger = require('../utils/logger');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  ROLES,
  PAYMENT_METHOD,
  AUDIT_EVENT,
  APPROVAL_TYPE,
  APPROVAL_DECISION,
} = require('../config/constants');
const Job = require('../models/job');
const Payment = require('../models/payment');
const Approval = require('../models/approval');
const { logEvent } = require('../models/auditLog');

// ── 1. POST /api/counter/payments ──────────────────────────────
// Counter staff or owner records a payment against a job
router.post(
  '/payments',
  authenticate,
  requireRole(ROLES.COUNTER_STAFF, ROLES.OWNER),
  async (req, res, next) => {
    try {
      const { job_id, amount, method, reference, notes } = req.body;

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Please enter a valid payment amount greater than zero.' });
      }

      const validMethods = Object.values(PAYMENT_METHOD);
      if (!method || !validMethods.includes(method)) {
        return res.status(400).json({
          error: `Invalid payment method. Allowed methods: ${validMethods.join(', ')}.`,
        });
      }

      const job = await Job.findById(job_id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
      }

      const result = await db.withTransaction(async (client) => {
        const recordResult = await Payment.recordPayment(
          {
            jobId: job_id,
            amount: numAmount,
            method,
            reference: reference?.trim() || null,
            receivedBy: req.user.id,
            notes: notes?.trim() || null,
          },
          client
        );

        await logEvent({
          jobId: job_id,
          actorUserId: req.user.id,
          actorLabel: req.user.name,
          eventType: AUDIT_EVENT.PAYMENT_RECORDED,
          oldValue: { payment_status: job.payment_status },
          newValue: {
            payment_id: recordResult.payment.id,
            amount: numAmount,
            method,
            reference: reference || null,
            payment_status: recordResult.paymentStatus,
          },
          notes: `Payment of KES ${numAmount} (${method.toUpperCase()}${reference ? ' Ref: ' + reference : ''}) recorded by ${req.user.name}.`,
          client,
        });

        return recordResult;
      });

      logger.info('Payment recorded', {
        jobId: job.id,
        jobNumber: job.job_number,
        amount: numAmount,
        method,
        receivedBy: req.user.name,
        newStatus: result.paymentStatus,
      });

      res.status(201).json({
        success: true,
        message: `Payment of KES ${numAmount} recorded successfully.`,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 2. POST /api/counter/payments/reversal ─────────────────────
// Owner only: records a payment reversal with audit reason
router.post(
  '/payments/reversal',
  authenticate,
  requireRole(ROLES.OWNER),
  async (req, res, next) => {
    try {
      const { job_id, amount, reason } = req.body;

      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Please enter a valid reversal amount greater than zero.' });
      }

      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: 'Reversal reason is mandatory for audit compliance.' });
      }

      const job = await Job.findById(job_id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
      }

      const result = await db.withTransaction(async (client) => {
        const revResult = await Payment.recordReversal(
          {
            jobId: job_id,
            amount: numAmount,
            receivedBy: req.user.id,
            reason: reason.trim(),
          },
          client
        );

        await logEvent({
          jobId: job_id,
          actorUserId: req.user.id,
          actorLabel: req.user.name,
          eventType: AUDIT_EVENT.PAYMENT_REVERSED,
          oldValue: { payment_status: job.payment_status },
          newValue: {
            reversal_id: revResult.reversal.id,
            amount: numAmount,
            payment_status: revResult.paymentStatus,
          },
          notes: `Reversal of KES ${numAmount} executed by Owner ${req.user.name}. Reason: ${reason}`,
          client,
        });

        return revResult;
      });

      logger.warn('Payment reversal executed', {
        jobId: job.id,
        jobNumber: job.job_number,
        amount: numAmount,
        executedBy: req.user.name,
        reason,
      });

      res.status(201).json({
        success: true,
        message: `Payment reversal of KES ${numAmount} recorded.`,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 3. GET /api/counter/jobs/:id/payments ──────────────────────
// Returns full payment ledger and balance summary
router.get(
  '/jobs/:id/payments',
  authenticate,
  requireRole(ROLES.COUNTER_STAFF, ROLES.OWNER, ROLES.REPAIRER),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const job = await Job.findById(id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
      }

      const summary = await Payment.getSummary(id);

      res.json({
        job: {
          id: job.id,
          job_number: job.job_number,
          customer_name: job.customer_name,
          customer_phone: job.customer_phone,
          status: job.status,
          payment_status: job.payment_status,
          service_name: job.service_name,
        },
        ...summary,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 4. POST /api/owner/payments/override or /api/counter/payments/override ─
// Owner allows pickup despite outstanding unpaid balance
router.post(
  ['/payments/override', '/override'],
  authenticate,
  requireRole(ROLES.OWNER),
  async (req, res, next) => {
    try {
      const { job_id, reason } = req.body;

      if (!job_id) {
        return res.status(400).json({ error: 'Job ID is required.' });
      }

      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: 'Reason for payment override is mandatory.' });
      }

      const job = await Job.findById(job_id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
      }

      const approval = await db.withTransaction(async (client) => {
        const appRecord = await Approval.createRequest(
          {
            jobId: job_id,
            type: APPROVAL_TYPE.PICKUP_OVERRIDE,
            requestedBy: req.user.id,
            reason: reason.trim(),
          },
          client
        );

        await Approval.recordDecision(
          {
            id: appRecord.id,
            decidedBy: req.user.id,
            decision: APPROVAL_DECISION.APPROVED,
            reason: reason.trim(),
          },
          client
        );

        await logEvent({
          jobId: job_id,
          actorUserId: req.user.id,
          actorLabel: req.user.name,
          eventType: AUDIT_EVENT.OVERRIDE_APPLIED,
          newValue: {
            approval_id: appRecord.id,
            type: APPROVAL_TYPE.PICKUP_OVERRIDE,
            decision: APPROVAL_DECISION.APPROVED,
          },
          notes: `Payment override granted by Owner ${req.user.name}. Reason: ${reason}`,
          client,
        });

        return appRecord;
      });

      logger.warn('Payment override applied by owner', {
        jobId: job.id,
        jobNumber: job.job_number,
        owner: req.user.name,
        reason,
      });

      res.json({
        success: true,
        message: 'Payment override granted. Customer can proceed to OTP release.',
        approval,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
