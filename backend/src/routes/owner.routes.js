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

// ================================================================
// OWNER DASHBOARD & REPORTS (MILESTONE 11)
// ================================================================

// ── GET /api/owner/dashboard ──────────────────────────────────
// Executive aggregates, KPIs, today's activity & cash summary
router.get('/dashboard', async (req, res, next) => {
  try {
    // 1. Total Active Jobs & Status breakdown
    const statusRes = await db.query(
      `SELECT status, COUNT(*)::int AS count
       FROM jobs
       GROUP BY status`
    );

    const statusCounts = {};
    let activeJobs = 0;
    const inactiveStatuses = ['Picked', 'Cancelled', 'Closed', 'Abandoned', 'Expired'];

    statusRes.rows.forEach((row) => {
      statusCounts[row.status] = row.count;
      if (!inactiveStatuses.includes(row.status)) {
        activeJobs += row.count;
      }
    });

    // 2. Today's Revenue (payments minus reversals)
    const revRes = await db.query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE -amount END), 0)::numeric(10,2) AS today_revenue
       FROM payments
       WHERE created_at >= CURRENT_DATE`
    );
    const todayRevenue = parseFloat(revRes.rows[0]?.today_revenue || 0);

    // 3. Completed Today
    const compRes = await db.query(
      `SELECT COUNT(*)::int AS completed_today
       FROM jobs
       WHERE status = 'Completed' AND updated_at >= CURRENT_DATE`
    );
    const completedToday = compRes.rows[0]?.completed_today || 0;

    // 4. Ready for Pickup
    const readyForPickup = statusCounts['Completed'] || 0;

    // 5. Pending Approvals Count
    const appRes = await db.query(
      `SELECT COUNT(*)::int AS pending_count
       FROM approvals
       WHERE decision IS NULL`
    );
    const pendingApprovals = appRes.rows[0]?.pending_count || 0;

    // 6. Cash Drawer Status for Today
    const cashRes = await db.query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE -amount END), 0)::numeric(10,2) AS cash_expected
       FROM payments
       WHERE method = 'cash' AND created_at >= CURRENT_DATE`
    );
    const cashExpectedToday = parseFloat(cashRes.rows[0]?.cash_expected || 0);

    const closeRes = await db.query(
      `SELECT * FROM day_close WHERE close_date = CURRENT_DATE`
    );
    const dayCloseRecord = closeRes.rows[0] || null;

    // 7. Recent Jobs Feed
    const recentRes = await db.query(
      `SELECT
         j.id,
         j.job_number,
         j.status,
         j.payment_status,
         j.shoe_brand,
         j.shoe_color,
         j.registered_at,
         j.received_at,
         c.name AS customer_name,
         c.phone AS customer_phone,
         sc.name AS service_name,
         u.name AS repairer_name,
         pv.amount AS latest_price
       FROM jobs j
       JOIN customers c ON j.customer_id = c.id
       JOIN service_catalog sc ON j.service_id = sc.id
       LEFT JOIN users u ON j.assigned_repairer = u.id
       LEFT JOIN LATERAL (
         SELECT amount FROM price_versions WHERE job_id = j.id ORDER BY version_number DESC LIMIT 1
       ) pv ON TRUE
       ORDER BY j.registered_at DESC
       LIMIT 8`
    );

    res.json({
      kpis: {
        activeJobs,
        todayRevenue,
        completedToday,
        readyForPickup,
        pendingApprovals,
      },
      statusCounts,
      cashSummary: {
        expectedCashToday: cashExpectedToday,
        isClosed: Boolean(dayCloseRecord),
        dayClose: dayCloseRecord,
      },
      recentJobs: recentRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/owner/jobs ───────────────────────────────────────
// Full paginated, searchable, filterable oversight of all jobs
router.get('/jobs', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const { status, payment_status, repairer_id, date_from, date_to, q } = req.query;

    const conditions = ['1=1'];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`j.status = $${params.length}`);
    }

    if (payment_status) {
      params.push(payment_status);
      conditions.push(`j.payment_status = $${params.length}`);
    }

    if (repairer_id) {
      params.push(repairer_id);
      conditions.push(`j.assigned_repairer = $${params.length}`);
    }

    if (date_from) {
      params.push(date_from);
      conditions.push(`j.registered_at >= $${params.length}`);
    }

    if (date_to) {
      params.push(`${date_to} 23:59:59.999`);
      conditions.push(`j.registered_at <= $${params.length}`);
    }

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      const pIdx = params.length;
      conditions.push(`(
        j.job_number ILIKE $${pIdx} OR
        c.name ILIKE $${pIdx} OR
        c.phone ILIKE $${pIdx} OR
        j.shoe_brand ILIKE $${pIdx}
      )`);
    }

    const whereClause = conditions.join(' AND ');

    // Count total matching jobs
    const countRes = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM jobs j
       JOIN customers c ON j.customer_id = c.id
       WHERE ${whereClause}`,
      params
    );
    const total = countRes.rows[0]?.total || 0;

    // Fetch paginated rows with full metadata
    const queryParams = [...params, limit, offset];
    const dataRes = await db.query(
      `SELECT
         j.id,
         j.job_number,
         j.status,
         j.payment_status,
         j.shoe_brand,
         j.shoe_color,
         j.notes AS problem_description,
         j.registered_at,
         j.received_at,
         j.picked_at,
         c.id AS customer_id,
         c.name AS customer_name,
         c.phone AS customer_phone,
         sc.id AS service_id,
         sc.name AS service_name,
         u.id AS repairer_id,
         u.name AS repairer_name,
         pv.amount AS latest_price,
         COALESCE(pay.total_paid, 0)::numeric(10,2) AS total_paid
       FROM jobs j
       JOIN customers c ON j.customer_id = c.id
       JOIN service_catalog sc ON j.service_id = sc.id
       LEFT JOIN users u ON j.assigned_repairer = u.id
       LEFT JOIN LATERAL (
         SELECT amount FROM price_versions WHERE job_id = j.id ORDER BY version_number DESC LIMIT 1
       ) pv ON TRUE
       LEFT JOIN LATERAL (
         SELECT SUM(CASE WHEN type = 'payment' THEN amount ELSE -amount END) AS total_paid
         FROM payments WHERE job_id = j.id
       ) pay ON TRUE
       WHERE ${whereClause}
       ORDER BY j.registered_at DESC
       LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
      queryParams
    );

    res.json({
      jobs: dataRes.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/owner/jobs/:id ───────────────────────────────────
// Comprehensive single job detail for slide-over inspection
router.get('/jobs/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const jobRes = await db.query(
      `SELECT
         j.*,
         c.name AS customer_name,
         c.phone AS customer_phone,
         sc.name AS service_name,
         sc.min_price AS catalog_min_price,
         sc.max_price AS catalog_max_price,
         u.name AS repairer_name,
         u.email AS repairer_email
       FROM jobs j
       JOIN customers c ON j.customer_id = c.id
       JOIN service_catalog sc ON j.service_id = sc.id
       LEFT JOIN users u ON j.assigned_repairer = u.id
       WHERE j.id = $1`,
      [id]
    );

    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const job = jobRes.rows[0];

    // Photos
    const photosRes = await db.query(
      `SELECT p.*, u.name AS taken_by_name
       FROM photos p
       JOIN users u ON p.taken_by = u.id
       WHERE p.job_id = $1
       ORDER BY p.created_at ASC`,
      [id]
    );

    // Price versions
    const priceRes = await db.query(
      `SELECT pv.*, u_prop.name AS proposed_by_name, u_app.name AS approved_by_name
       FROM price_versions pv
       JOIN users u_prop ON pv.proposed_by = u_prop.id
       LEFT JOIN users u_app ON pv.approved_by = u_app.id
       WHERE pv.job_id = $1
       ORDER BY pv.version_number ASC`,
      [id]
    );

    // Payments
    const payRes = await db.query(
      `SELECT p.*, u.name AS received_by_name
       FROM payments p
       JOIN users u ON p.received_by = u.id
       WHERE p.job_id = $1
       ORDER BY p.created_at ASC`,
      [id]
    );

    // Approvals
    const appRes = await db.query(
      `SELECT a.*, u_req.name AS requested_by_name, u_dec.name AS decided_by_name
       FROM approvals a
       JOIN users u_req ON a.requested_by = u_req.id
       LEFT JOIN users u_dec ON a.decided_by = u_dec.id
       WHERE a.job_id = $1
       ORDER BY a.requested_at ASC`,
      [id]
    );

    res.json({
      job,
      photos: photosRes.rows,
      priceVersions: priceRes.rows,
      payments: payRes.rows,
      approvals: appRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/owner/reports/daily ──────────────────────────────
// Daily financial and operational report for a specific date
router.get('/reports/daily', async (req, res, next) => {
  try {
    const reportDate = req.query.date || new Date().toISOString().split('T')[0];

    // 1. Daily operational counts
    const countsRes = await db.query(
      `SELECT
         COUNT(CASE WHEN DATE(j.registered_at) = $1 OR DATE(j.received_at) = $1 THEN 1 END)::int AS jobs_received,
         COUNT(CASE WHEN j.status = 'Completed' AND DATE(j.updated_at) = $1 THEN 1 END)::int AS jobs_completed,
         COUNT(CASE WHEN j.status = 'Picked' AND DATE(j.picked_at) = $1 THEN 1 END)::int AS jobs_picked
       FROM jobs j`,
      [reportDate]
    );
    const opsCounts = countsRes.rows[0];

    // 2. Total revenue for the date
    const revRes = await db.query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE -amount END), 0)::numeric(10,2) AS total_revenue
       FROM payments
       WHERE DATE(created_at) = $1`,
      [reportDate]
    );
    const totalRevenue = parseFloat(revRes.rows[0]?.total_revenue || 0);

    // 3. Revenue by Service
    const serviceRes = await db.query(
      `SELECT
         sc.name AS service_name,
         COUNT(DISTINCT j.id)::int AS job_count,
         COALESCE(SUM(CASE WHEN p.type = 'payment' THEN p.amount ELSE -p.amount END), 0)::numeric(10,2) AS revenue
       FROM payments p
       JOIN jobs j ON p.job_id = j.id
       JOIN service_catalog sc ON j.service_id = sc.id
       WHERE DATE(p.created_at) = $1
       GROUP BY sc.name
       ORDER BY revenue DESC`,
      [reportDate]
    );

    // 4. Payment Methods Breakdown
    const methodRes = await db.query(
      `SELECT
         method,
         COUNT(*)::int AS count,
         COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE -amount END), 0)::numeric(10,2) AS total
       FROM payments
       WHERE DATE(created_at) = $1
       GROUP BY method
       ORDER BY total DESC`,
      [reportDate]
    );

    // 5. Day Close record if present
    const closeRes = await db.query(
      `SELECT dc.*, u.name AS closed_by_name
       FROM day_close dc
       JOIN users u ON dc.closed_by = u.id
       WHERE dc.close_date = $1`,
      [reportDate]
    );

    res.json({
      date: reportDate,
      jobsReceived: opsCounts.jobs_received,
      jobsCompleted: opsCounts.jobs_completed,
      jobsPicked: opsCounts.jobs_picked,
      totalRevenue,
      serviceBreakdown: serviceRes.rows,
      paymentMethodsBreakdown: methodRes.rows,
      dayClose: closeRes.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/owner/day-close ─────────────────────────────────
// Cash drawer reconciliation: records counted cash vs expected cash
router.post('/day-close', async (req, res, next) => {
  try {
    const { close_date, cash_counted, bank_deposit_reference, notes } = req.body;

    const dateToClose = close_date || new Date().toISOString().split('T')[0];

    if (cash_counted === undefined || cash_counted === null || isNaN(Number(cash_counted))) {
      return res.status(400).json({ error: 'Valid cash counted amount is required.' });
    }

    const counted = parseFloat(cash_counted);
    if (counted < 0) {
      return res.status(400).json({ error: 'Cash counted cannot be negative.' });
    }

    // Compute expected cash from database payments for that date
    const expectedRes = await db.query(
      `SELECT COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE -amount END), 0)::numeric(10,2) AS cash_expected
       FROM payments
       WHERE method = 'cash' AND DATE(created_at) = $1`,
      [dateToClose]
    );
    const cashExpected = parseFloat(expectedRes.rows[0]?.cash_expected || 0);
    const variance = counted - cashExpected;

    // Upsert into day_close table
    const result = await db.query(
      `INSERT INTO day_close (close_date, cash_expected, cash_counted, bank_deposit_reference, closed_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (close_date) DO UPDATE
       SET cash_expected = EXCLUDED.cash_expected,
           cash_counted = EXCLUDED.cash_counted,
           bank_deposit_reference = EXCLUDED.bank_deposit_reference,
           closed_by = EXCLUDED.closed_by,
           notes = EXCLUDED.notes
       RETURNING *`,
      [
        dateToClose,
        cashExpected,
        counted,
        bank_deposit_reference?.trim() || null,
        req.user.id,
        notes?.trim() || null,
      ]
    );

    logger.info('Daily cash close recorded', {
      date: dateToClose,
      cashExpected,
      cashCounted: counted,
      variance,
      closedBy: req.user.name,
    });

    res.json({
      success: true,
      message: `Daily close for ${dateToClose} saved successfully.`,
      dayClose: result.rows[0],
      variance,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/owner/day-close/history ──────────────────────────
// History of recent daily closes and variances
router.get('/day-close/history', async (req, res, next) => {
  try {
    const historyRes = await db.query(
      `SELECT
         dc.*,
         (dc.cash_counted - dc.cash_expected)::numeric(10,2) AS variance,
         u.name AS closed_by_name
       FROM day_close dc
       JOIN users u ON dc.closed_by = u.id
       ORDER BY dc.close_date DESC
       LIMIT 30`
    );

    res.json({ history: historyRes.rows });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/owner/sms-volume ─────────────────────────────────
// Daily count of SMS messages dispatched for the last 30 days
router.get('/sms-volume', async (req, res, next) => {
  try {
    const resSms = await db.query(
      `SELECT
         d::date AS date,
         COALESCE(COUNT(s.id), 0)::int AS count
       FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day'::interval) d
       LEFT JOIN sms_log s ON DATE(s.created_at) = d::date
       GROUP BY d::date
       ORDER BY d::date ASC`
    );

    const totalSent = resSms.rows.reduce((sum, r) => sum + r.count, 0);

    res.json({
      dailyVolume: resSms.rows,
      totalSent,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

