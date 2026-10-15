'use strict';
/**
 * pickup.routes.js — Customer pickup code generation, SMS dispatch, and verbal OTP verification.
 *
 * Rules (SRS OTP-01 to OTP-05, SEC-05):
 *  - Customer receives 6-digit numeric OTP via SMS only
 *  - Pickup OTP is NEVER exposed in any API response or staff screen
 *  - Requires job status = 'Completed' AND (payment_status = 'Paid' OR approved payment override)
 *  - Verification takes 6 digits verbal from customer, compares bcrypt hash
 *  - 3 incorrect attempts locks the code
 *  - Successful verification transitions job to 'Picked'
 */

const express = require('express');
const router = express.Router();

const db = require('../config/db');
const logger = require('../utils/logger');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  ROLES,
  JOB_STATUS,
  PAYMENT_STATUS,
  AUDIT_EVENT,
  APPROVAL_TYPE,
  APPROVAL_DECISION,
} = require('../config/constants');
const { assertTransition } = require('../services/stateMachine');
const Job = require('../models/job');
const PickupCode = require('../models/pickupCode');
const smsService = require('../services/sms.service');
const { logEvent } = require('../models/auditLog');

// Helper to resolve job by either UUID or 64-char hex access token
async function resolveJob(identifier) {
  if (identifier.length === 64) {
    return Job.findByAccessToken(identifier);
  }
  return Job.findById(identifier);
}

// ── 1. POST /api/pickup/:identifier/send-code ──────────────────
// Sends 6-digit pickup code via SMS to the customer's phone
router.post('/:identifier/send-code', async (req, res, next) => {
  try {
    const { identifier } = req.params;
    const job = await resolveJob(identifier);

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    // Must be in Completed status
    if (job.status !== JOB_STATUS.COMPLETED) {
      return res.status(400).json({
        error: `Cannot request pickup code for job in '${job.status}'. Shoes must be 'Completed' first.`,
      });
    }

    // Must be Paid OR have approved override
    let isAuthorized = job.payment_status === PAYMENT_STATUS.PAID;

    if (!isAuthorized) {
      const overrideRes = await db.query(
        `SELECT id FROM approvals
         WHERE job_id = $1 AND type = $2 AND decision = $3
         LIMIT 1`,
        [job.id, APPROVAL_TYPE.PICKUP_OVERRIDE, APPROVAL_DECISION.APPROVED]
      );
      if (overrideRes.rows.length > 0) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(402).json({
        error: 'Outstanding payment due. Full payment or an owner override is required before release code can be generated.',
        paymentStatus: job.payment_status,
      });
    }

    // Generate code and save bcrypt hash
    const { record, plainCode } = await PickupCode.createCode(job.id);

    // Send SMS with plain code directly to customer phone
    if (job.customer_phone) {
      await smsService.sendPickupCode(job.customer_phone, plainCode);
    }

    await logEvent({
      jobId: job.id,
      actorLabel: req.user ? req.user.name : 'customer',
      actorUserId: req.user?.id || null,
      eventType: AUDIT_EVENT.PICKUP_CODE_SENT,
      newValue: { expires_at: record.expires_at },
      notes: 'New 6-digit pickup OTP generated and dispatched via SMS.',
    });

    logger.info('Pickup OTP dispatched', {
      jobId: job.id,
      jobNumber: job.job_number,
      phone: job.customer_phone ? 'masked' : 'none',
    });

    // SECURITY: CRITICAL — plainCode is deliberately excluded from response
    res.json({
      success: true,
      message: `Pickup code sent via SMS to customer's registered phone. Valid for 24 hours.`,
      expiresAt: record.expires_at,
    });
  } catch (err) {
    next(err);
  }
});

// ── 2. POST /api/pickup/:jobId/verify ──────────────────────────
// Staff inputs verbal 6-digit OTP told by customer at counter
router.post(
  '/:jobId/verify',
  authenticate,
  requireRole(ROLES.COUNTER_STAFF, ROLES.REPAIRER, ROLES.OWNER),
  async (req, res, next) => {
    try {
      const { jobId } = req.params;
      const { code } = req.body;

      if (!code || String(code).trim().length !== 6) {
        return res.status(400).json({ error: 'Please enter a valid 6-digit pickup code.' });
      }

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
      }

      // State machine validation
      assertTransition(job.status, JOB_STATUS.PICKED, req.user.role);

      const verification = await PickupCode.verifyCode(jobId, String(code));

      if (!verification.success) {
        await logEvent({
          jobId,
          actorUserId: req.user.id,
          actorLabel: req.user.name,
          eventType: verification.isLocked
            ? AUDIT_EVENT.PICKUP_CODE_LOCKED
            : AUDIT_EVENT.PICKUP_CODE_FAILED,
          notes: `Failed pickup OTP attempt (${verification.attempts} recorded) by staff ${req.user.name}.${verification.isLocked ? ' Code locked.' : ''}`,
        });

        return res.status(400).json({
          success: false,
          error: verification.message,
          remaining: verification.remaining,
          locked: verification.isLocked,
        });
      }

      // Verification succeeded: Transition job to 'Picked'
      await db.withTransaction(async (client) => {
        await client.query(
          `UPDATE jobs
           SET status = $1,
               picked_at = NOW(),
               updated_at = NOW()
           WHERE id = $2`,
          [JOB_STATUS.PICKED, jobId]
        );

        await logEvent({
          jobId,
          actorUserId: req.user.id,
          actorLabel: req.user.name,
          eventType: AUDIT_EVENT.JOB_PICKED,
          oldValue: { status: job.status },
          newValue: { status: JOB_STATUS.PICKED },
          notes: `Verified verbal customer OTP successfully. Shoes released by ${req.user.name}.`,
          client,
        });
      });

      logger.info('Shoes picked up and released', {
        jobId,
        jobNumber: job.job_number,
        releasedBy: req.user.name,
      });

      res.json({
        success: true,
        message: `Pickup code verified! Job ${job.job_number} marked as Picked and shoes released.`,
        status: JOB_STATUS.PICKED,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 3. POST /api/pickup/:jobId/request-new-code ────────────────
// Invalidate previous code and send a fresh one
router.post(
  '/:jobId/request-new-code',
  authenticate,
  requireRole(ROLES.COUNTER_STAFF, ROLES.OWNER),
  async (req, res, next) => {
    try {
      const { jobId } = req.params;
      const job = await Job.findById(jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
      }

      await PickupCode.invalidateCodes(jobId);
      const { record, plainCode } = await PickupCode.createCode(jobId);

      if (job.customer_phone) {
        await smsService.sendPickupCode(job.customer_phone, plainCode);
      }

      await logEvent({
        jobId,
        actorUserId: req.user.id,
        actorLabel: req.user.name,
        eventType: AUDIT_EVENT.PICKUP_CODE_SENT,
        notes: `New pickup code requested and dispatched by ${req.user.name}. Previous codes invalidated.`,
      });

      res.json({
        success: true,
        message: 'Previous code invalidated. New 6-digit pickup code sent to customer phone.',
        expiresAt: record.expires_at,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── 4. GET /api/pickup/:jobId/status ───────────────────────────
// Check pickup readiness and code status
router.get(
  '/:jobId/status',
  authenticate,
  requireRole(ROLES.COUNTER_STAFF, ROLES.REPAIRER, ROLES.OWNER),
  async (req, res, next) => {
    try {
      const { jobId } = req.params;
      const job = await Job.findById(jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found.' });
      }

      const activeCode = await PickupCode.getActiveRecord(jobId);

      const overrideRes = await db.query(
        `SELECT id FROM approvals
         WHERE job_id = $1 AND type = $2 AND decision = $3
         LIMIT 1`,
        [jobId, APPROVAL_TYPE.PICKUP_OVERRIDE, APPROVAL_DECISION.APPROVED]
      );
      const hasOverride = overrideRes.rows.length > 0;

      res.json({
        job: {
          id: job.id,
          job_number: job.job_number,
          status: job.status,
          payment_status: job.payment_status,
          customer_name: job.customer_name,
          customer_phone: job.customer_phone,
          shoe_brand: job.shoe_brand,
          shoe_color: job.shoe_color,
          service_name: job.service_name,
        },
        hasActiveCode: Boolean(activeCode),
        attempts: activeCode?.attempts || 0,
        isLocked: (activeCode?.attempts || 0) >= 3,
        expiresAt: activeCode?.expires_at || null,
        hasPaymentOverride: hasOverride,
        isEligibleForPickup: job.status === JOB_STATUS.COMPLETED && (job.payment_status === PAYMENT_STATUS.PAID || hasOverride),
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
