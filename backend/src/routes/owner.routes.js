'use strict';
/**
 * owner.routes.js — Owner-only endpoints.
 * Staff CRUD: POST/GET/PATCH /api/owner/staff
 * (Dashboard, approvals, reports etc. added in later milestones)
 */

const express  = require('express');
const router   = express.Router();

const db = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  ROLES,
  APPROVAL_DECISION,
  APPROVAL_TYPE,
  AUDIT_EVENT,
  JOB_STATUS,
} = require('../config/constants');
const User       = require('../models/user');
const Approval   = require('../models/approval');
const Job        = require('../models/job');
const Price      = require('../models/price');
const ServiceCatalog = require('../models/serviceCatalog');
const smsService = require('../services/sms.service');
const { assertTransition } = require('../services/stateMachine');
const { logEvent } = require('../models/auditLog');
const logger     = require('../utils/logger');

// All routes in this file require owner role
router.use(authenticate, requireRole(ROLES.OWNER));

// ── GET /api/owner/staff ──────────────────────────────────────
router.get('/staff', async (req, res, next) => {
  try {
    const users = await User.listAll();
    res.json({ staff: users });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/owner/staff ─────────────────────────────────────
router.post('/staff', async (req, res, next) => {
  try {
    const { name, role, email, phone, password } = req.body;

    if (!name || !role || !email || !password) {
      return res.status(400).json({ error: 'name, role, email and password are required.' });
    }

    const validRoles = [ROLES.COUNTER_STAFF, ROLES.REPAIRER, ROLES.OWNER];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}.` });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const user = await User.create({ name, role, email, phone, password });

    logger.info('Staff account created', {
      createdBy: req.user.id,
      newUserId: user.id,
      role: user.role,
    });

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/owner/staff/:id ────────────────────────────────
router.patch('/staff/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, phone, active } = req.body;

    // Prevent owner from locking themselves out
    if (id === req.user.id && active === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    if (role) {
      const validRoles = [ROLES.COUNTER_STAFF, ROLES.REPAIRER, ROLES.OWNER];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role.` });
      }
    }

    const updated = await User.update(id, { name, role, phone, active });
    if (!updated) return res.status(404).json({ error: 'Staff member not found.' });

    logger.info('Staff account updated', {
      updatedBy: req.user.id,
      targetId: id,
      changes: { name, role, active },
    });

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
});

// ================================================================
// SERVICE CATALOG MANAGEMENT (OWNER)
// ================================================================


// ── GET /api/owner/catalog ────────────────────────────────────
router.get('/catalog', async (req, res, next) => {
  try {
    const services = await ServiceCatalog.listAll();
    res.json({ services });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/owner/catalog ───────────────────────────────────
router.post('/catalog', async (req, res, next) => {
  try {
    const { name, min_price, max_price, standard_turnaround_hours } = req.body;

    if (!name || min_price === undefined || min_price === null) {
      return res.status(400).json({ error: 'Service name and minimum price are required.' });
    }

    const min = Number(min_price);
    if (isNaN(min) || min < 0) {
      return res.status(400).json({ error: 'Minimum price must be a non-negative number.' });
    }

    let max = null;
    if (max_price !== undefined && max_price !== null && max_price !== '') {
      max = Number(max_price);
      if (isNaN(max) || max < min) {
        return res.status(400).json({ error: 'Maximum price must be greater than or equal to minimum price.' });
      }
    }

    const existing = await ServiceCatalog.findByName(name);
    if (existing) {
      return res.status(409).json({ error: 'A service with this name already exists in the catalog.' });
    }

    const hours = standard_turnaround_hours ? parseInt(standard_turnaround_hours, 10) : null;
    const service = await ServiceCatalog.create({
      name,
      min_price: min,
      max_price: max,
      standard_turnaround_hours: hours,
    });

    logger.info('Service catalog item created', {
      createdBy: req.user.id,
      serviceId: service.id,
      name: service.name,
    });

    res.status(201).json({ service });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/owner/catalog/:id ──────────────────────────────
router.patch('/catalog/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, min_price, max_price, standard_turnaround_hours, active } = req.body;

    const current = await ServiceCatalog.findById(id);
    if (!current) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (active !== undefined) updates.active = Boolean(active);
    if (standard_turnaround_hours !== undefined) {
      updates.standard_turnaround_hours = standard_turnaround_hours ? parseInt(standard_turnaround_hours, 10) : null;
    }

    if (min_price !== undefined) {
      const min = Number(min_price);
      if (isNaN(min) || min < 0) {
        return res.status(400).json({ error: 'Minimum price must be a non-negative number.' });
      }
      updates.min_price = min;
    }

    if (max_price !== undefined) {
      if (max_price === null || max_price === '') {
        updates.max_price = null;
      } else {
        const max = Number(max_price);
        const effectiveMin = updates.min_price !== undefined ? updates.min_price : Number(current.min_price);
        if (isNaN(max) || max < effectiveMin) {
          return res.status(400).json({ error: 'Maximum price must be greater than or equal to minimum price.' });
        }
        updates.max_price = max;
      }
    }

    const updated = await ServiceCatalog.update(id, updates);

    logger.info('Service catalog item updated', {
      updatedBy: req.user.id,
      serviceId: id,
      updates,
    });

    res.json({ service: updated });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/owner/catalog/:id (Soft Delete) ───────────────
router.delete('/catalog/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await ServiceCatalog.softDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    logger.info('Service catalog item deactivated', {
      deactivatedBy: req.user.id,
      serviceId: id,
    });

    res.json({ message: 'Service successfully deactivated.', service: deleted });
  } catch (err) {
    next(err);
  }
});

// ================================================================
// OWNER APPROVALS (MILESTONE 10)
// ================================================================

// ── GET /api/owner/approvals ──────────────────────────────────
// List pending owner approvals
router.get('/approvals', async (req, res, next) => {
  try {
    const { type } = req.query;
    const approvals = await Approval.getPending(type || null);
    res.json({ approvals });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/owner/approvals/:id/decide ───────────────────────
// Owner approves or rejects an out-of-band price, override, or alternate ID
router.post('/approvals/:id/decide', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, reason } = req.body;

    const validDecisions = [APPROVAL_DECISION.APPROVED, APPROVAL_DECISION.REJECTED];
    if (!decision || !validDecisions.includes(decision)) {
      return res.status(400).json({
        error: `Decision must be either '${APPROVAL_DECISION.APPROVED}' or '${APPROVAL_DECISION.REJECTED}'.`,
      });
    }

    if (decision === APPROVAL_DECISION.REJECTED && (!reason || !reason.trim())) {
      return res.status(400).json({ error: 'Rejection reason is required.' });
    }

    const approval = await Approval.findById(id);
    if (!approval) {
      return res.status(404).json({ error: 'Approval request not found.' });
    }

    if (approval.decision) {
      return res.status(400).json({ error: `This request has already been ${approval.decision}.` });
    }

    const job = await Job.findById(approval.job_id);
    if (!job) {
      return res.status(404).json({ error: 'Associated job not found.' });
    }

    let updatedApproval;
    let priceVersion = null;

    await db.withTransaction(async (client) => {
      // 1. Record decision
      updatedApproval = await Approval.recordDecision(
        {
          id,
          decidedBy: req.user.id,
          decision,
          reason: reason?.trim() || null,
        },
        client
      );

      // 2. Handle specific approval types
      if (approval.type === APPROVAL_TYPE.OUT_OF_BAND_PRICE) {
        priceVersion = await Price.getLatestForJob(job.id, client);

        if (decision === APPROVAL_DECISION.APPROVED) {
          // Record owner approval on price version
          if (priceVersion) {
            await Price.recordOwnerApproval(
              {
                jobId: job.id,
                versionNumber: priceVersion.version_number,
                approvedBy: req.user.id,
              },
              client
            );
          }

          // Transition job to 'Awaiting Confirmation'
          assertTransition(job.status, JOB_STATUS.AWAITING_CONFIRMATION, req.user.role);

          await client.query(
            `UPDATE jobs
             SET status = $1,
                 updated_at = NOW()
             WHERE id = $2`,
            [JOB_STATUS.AWAITING_CONFIRMATION, job.id]
          );

          await logEvent({
            jobId: job.id,
            actorUserId: req.user.id,
            actorLabel: req.user.name,
            eventType: AUDIT_EVENT.APPROVAL_DECIDED,
            oldValue: { status: job.status },
            newValue: {
              status: JOB_STATUS.AWAITING_CONFIRMATION,
              decision,
              amount: priceVersion?.amount,
            },
            notes: `Owner approved out-of-band price quote of KES ${priceVersion?.amount}. Customer notified.`,
            client,
          });
        } else {
          // Rejection
          await logEvent({
            jobId: job.id,
            actorUserId: req.user.id,
            actorLabel: req.user.name,
            eventType: AUDIT_EVENT.APPROVAL_DECIDED,
            newValue: { decision, reason },
            notes: `Owner rejected out-of-band price quote of KES ${priceVersion?.amount}. Reason: ${reason}. Job held in queue for revised pricing.`,
            client,
          });
        }
      } else {
        // Generic approval log
        await logEvent({
          jobId: job.id,
          actorUserId: req.user.id,
          actorLabel: req.user.name,
          eventType: AUDIT_EVENT.APPROVAL_DECIDED,
          newValue: { type: approval.type, decision, reason },
          notes: `Owner decided approval request '${approval.type}': ${decision}.${reason ? ' Reason: ' + reason : ''}`,
          client,
        });
      }
    });

    // Send SMS to customer only if price was approved (outside transaction)
    if (
      approval.type === APPROVAL_TYPE.OUT_OF_BAND_PRICE &&
      decision === APPROVAL_DECISION.APPROVED &&
      priceVersion &&
      job.customer_phone
    ) {
      await smsService.sendPriceProposed(
        job.customer_phone,
        job.job_number,
        priceVersion.amount,
        job.access_token
      );
    }

    logger.info('Owner approval decision recorded', {
      approvalId: id,
      jobId: job.id,
      type: approval.type,
      decision,
    });

    res.json({
      success: true,
      message: `Approval request ${decision} successfully.`,
      approval: updatedApproval,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/owner/pickup-override ───────────────────────────
// Owner grants pickup without standard code and marks shoes picked in one step
router.post('/pickup-override', async (req, res, next) => {
  try {
    const { job_id, reason } = req.body;

    if (!job_id) {
      return res.status(400).json({ error: 'Job ID is required.' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason for owner pickup override is mandatory for audit trail.' });
    }

    const job = await Job.findById(job_id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    assertTransition(job.status, JOB_STATUS.PICKED, req.user.role);

    await db.withTransaction(async (client) => {
      // Create and approve override record
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

      // Transition job to Picked
      await client.query(
        `UPDATE jobs
         SET status = $1,
             picked_at = NOW(),
             updated_at = NOW()
         WHERE id = $2`,
        [JOB_STATUS.PICKED, job_id]
      );

      await logEvent({
        jobId: job_id,
        actorUserId: req.user.id,
        actorLabel: req.user.name,
        eventType: AUDIT_EVENT.OVERRIDE_APPLIED,
        oldValue: { status: job.status },
        newValue: { status: JOB_STATUS.PICKED, override_type: 'pickup_without_code' },
        notes: `Owner override: Shoes released without OTP. Reason: ${reason}`,
        client,
      });

      await logEvent({
        jobId: job_id,
        actorUserId: req.user.id,
        actorLabel: req.user.name,
        eventType: AUDIT_EVENT.JOB_PICKED,
        notes: `Shoes collected via Owner direct override.`,
        client,
      });
    });

    logger.warn('Direct owner pickup override executed', {
      jobId: job.id,
      jobNumber: job.job_number,
      owner: req.user.name,
      reason,
    });

    res.json({
      success: true,
      message: `Pickup override granted and Job ${job.job_number} marked as Picked.`,
      status: JOB_STATUS.PICKED,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
