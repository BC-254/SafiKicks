'use strict';
/**
 * repairer.routes.js — Repairer queue, job claiming, pricing, and execution lifecycle.
 * Roles: 'repairer' | 'owner'
 *
 * Privacy & Security rules (SRS REP-01, SEC-07):
 *  - Repairers never see full customer phone numbers
 *  - Repairers only see customer first name on queue and active job cards
 *  - Claiming a job uses atomic DB query with WHERE assigned_repairer IS NULL (race protection)
 *  - Out-of-band prices are automatically routed to owner approvals; customer is NOT notified
 *  - Transitions strictly enforced by stateMachine.assertTransition
 */

const express = require('express');
const router = express.Router();

const db = require('../config/db');
const logger = require('../utils/logger');
const { authenticate, requireRole } = require('../middleware/auth');
const {
  ROLES,
  JOB_STATUS,
  AUDIT_EVENT,
  PHOTO_TYPE,
  APPROVAL_TYPE,
} = require('../config/constants');
const { assertTransition } = require('../services/stateMachine');
const { upload, saveCompressedPhoto } = require('../services/photo.service');
const smsService = require('../services/sms.service');
const Job = require('../models/job');
const Price = require('../models/price');
const Approval = require('../models/approval');
const Photo = require('../models/photo');
const ServiceCatalog = require('../models/serviceCatalog');
const { logEvent, getJobTimeline } = require('../models/auditLog');

// Guard all repairer routes
router.use(authenticate, requireRole(ROLES.REPAIRER, ROLES.OWNER));

// ── 1. GET /api/repairer/queue ─────────────────────────────────
// Returns unassigned jobs in 'In Queue' status, oldest first (FIFO)
router.get('/queue', async (req, res, next) => {
  try {
    const r = await db.query(
      `SELECT
         j.id,
         j.job_number,
         j.status,
         j.shoe_brand,
         j.shoe_color,
         j.notes,
         j.registered_at,
         j.received_at,
         SPLIT_PART(c.name, ' ', 1) AS customer_first_name,
         sc.name AS service_name,
         sc.min_price AS catalog_min_price,
         sc.max_price AS catalog_max_price,
         (SELECT COUNT(*) FROM photos p WHERE p.job_id = j.id AND p.type = 'receipt')::int AS receipt_photo_count,
         (SELECT file_url FROM photos p WHERE p.job_id = j.id AND p.type = 'receipt' ORDER BY p.created_at ASC LIMIT 1) AS cover_photo_url
       FROM jobs j
       JOIN customers c ON j.customer_id = c.id
       JOIN service_catalog sc ON j.service_id = sc.id
       WHERE j.status = $1 AND j.assigned_repairer IS NULL
       ORDER BY j.received_at ASC NULLS LAST, j.registered_at ASC`,
      [JOB_STATUS.IN_QUEUE]
    );

    res.json({ queue: r.rows });
  } catch (err) {
    next(err);
  }
});

// ── 2. POST /api/repairer/jobs/:id/claim ───────────────────────
// Atomic job claim preventing race conditions between concurrent repairers
router.post('/jobs/:id/claim', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Atomic update with WHERE assigned_repairer IS NULL
    const result = await db.withTransaction(async (client) => {
      const updateRes = await client.query(
        `UPDATE jobs
         SET assigned_repairer = $1,
             updated_at = NOW()
         WHERE id = $2 AND status = $3 AND assigned_repairer IS NULL
         RETURNING *`,
        [req.user.id, id, JOB_STATUS.IN_QUEUE]
      );

      if (updateRes.rows.length === 0) {
        // Find why it failed
        const check = await client.query('SELECT status, assigned_repairer FROM jobs WHERE id = $1', [id]);
        if (check.rows.length === 0) {
          const err = new Error('Job not found.');
          err.statusCode = 404;
          throw err;
        }
        if (check.rows[0].assigned_repairer) {
          const err = new Error('Job has already been claimed by another repairer.');
          err.statusCode = 409;
          throw err;
        }
        const err = new Error(`Cannot claim job in status '${check.rows[0].status}'. Must be 'In Queue'.`);
        err.statusCode = 400;
        throw err;
      }

      const claimedJob = updateRes.rows[0];

      await logEvent({
        jobId: id,
        actorUserId: req.user.id,
        actorLabel: req.user.name,
        eventType: AUDIT_EVENT.JOB_CLAIMED,
        newValue: { assigned_repairer: req.user.id, repairer_name: req.user.name },
        notes: `Claimed from queue by repairer ${req.user.name}.`,
        client,
      });

      return claimedJob;
    });

    logger.info('Job claimed by repairer', {
      jobId: id,
      jobNumber: result.job_number,
      repairer: req.user.name,
    });

    res.json({
      success: true,
      message: `Job ${result.job_number} claimed successfully.`,
      job: result,
    });
  } catch (err) {
    next(err);
  }
});

// ── 3. POST /api/repairer/jobs/:id/price ───────────────────────
// Propose a price. Band validation check:
// - If in-band: transitions to 'Awaiting Confirmation', sends SMS to customer
// - If out-of-band: creates approval request for owner, customer NOT notified yet
router.post('/jobs/:id/price', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid price amount greater than zero.' });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    // Role check: must be assigned repairer or owner
    if (job.assigned_repairer !== req.user.id && req.user.role !== ROLES.OWNER) {
      return res.status(403).json({ error: 'Only the assigned repairer can submit pricing for this job.' });
    }

    // Job must be in In Queue or On Hold
    if (![JOB_STATUS.IN_QUEUE, JOB_STATUS.ON_HOLD].includes(job.status)) {
      return res.status(400).json({
        error: `Cannot propose price while job is in '${job.status}'. Must be 'In Queue' or 'On Hold'.`,
      });
    }

    const service = await ServiceCatalog.findById(job.service_id);
    const minPrice = parseFloat(service.min_price);
    const maxPrice = service.max_price !== null ? parseFloat(service.max_price) : null;

    const isInBand = numAmount >= minPrice && (maxPrice === null || numAmount <= maxPrice);

    let priceVersion;
    let approvalRecord = null;

    if (isInBand) {
      // IN-BAND: Propose price -> Transition to Awaiting Confirmation -> Send SMS
      assertTransition(job.status, JOB_STATUS.AWAITING_CONFIRMATION, req.user.role);

      await db.withTransaction(async (client) => {
        priceVersion = await Price.proposePrice(
          { jobId: id, amount: numAmount, proposedBy: req.user.id },
          client
        );

        await client.query(
          `UPDATE jobs
           SET status = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [JOB_STATUS.AWAITING_CONFIRMATION, id]
        );

        await logEvent({
          jobId: id,
          actorUserId: req.user.id,
          actorLabel: req.user.name,
          eventType: AUDIT_EVENT.PRICE_PROPOSED,
          oldValue: { status: job.status },
          newValue: {
            status: JOB_STATUS.AWAITING_CONFIRMATION,
            amount: numAmount,
            version_number: priceVersion.version_number,
            in_band: true,
          },
          notes: `Price of KES ${numAmount} proposed by ${req.user.name} (within catalog band KES ${minPrice} - ${maxPrice || 'unlimited'}).`,
          client,
        });
      });

      // Send SMS to customer (out of transaction)
      if (job.customer_phone) {
        if (job.status === JOB_STATUS.ON_HOLD) {
          await smsService.sendRevisedPrice(
            job.customer_phone,
            job.job_number,
            notes || 'Additional repair work required',
            numAmount,
            job.access_token
          );
        } else {
          await smsService.sendPriceProposed(job.customer_phone, job.job_number, numAmount, job.access_token);
        }
      }

      logger.info('In-band price proposed & customer notified', {
        jobId: id,
        jobNumber: job.job_number,
        amount: numAmount,
      });

      return res.json({
        success: true,
        inBand: true,
        message: `Price of KES ${numAmount} proposed. Confirmation request sent to customer.`,
        priceVersion,
        status: JOB_STATUS.AWAITING_CONFIRMATION,
      });
    } else {
      // OUT-OF-BAND: Propose price -> Create approval request -> Do NOT notify customer
      await db.withTransaction(async (client) => {
        priceVersion = await Price.proposePrice(
          { jobId: id, amount: numAmount, proposedBy: req.user.id },
          client
        );

        approvalRecord = await Approval.createRequest(
          {
            jobId: id,
            type: APPROVAL_TYPE.OUT_OF_BAND_PRICE,
            requestedBy: req.user.id,
            reason: `Proposed KES ${numAmount} is outside catalog band (KES ${minPrice} - ${maxPrice || 'any'}). Notes: ${notes || 'None'}`,
          },
          client
        );

        await logEvent({
          jobId: id,
          actorUserId: req.user.id,
          actorLabel: req.user.name,
          eventType: AUDIT_EVENT.APPROVAL_REQUESTED,
          newValue: {
            approval_id: approvalRecord.id,
            type: APPROVAL_TYPE.OUT_OF_BAND_PRICE,
            amount: numAmount,
            catalog_band: `${minPrice} - ${maxPrice || 'any'}`,
          },
          notes: `Price KES ${numAmount} is out-of-band. Owner approval requested by ${req.user.name}. Customer notification held pending approval.`,
          client,
        });
      });

      logger.warn('Out-of-band price proposed — held for owner approval', {
        jobId: id,
        jobNumber: job.job_number,
        amount: numAmount,
        minPrice,
        maxPrice,
      });

      return res.json({
        success: true,
        inBand: false,
        message: `Price of KES ${numAmount} is outside the standard catalog band (KES ${minPrice} – ${maxPrice || 'any'}). Submitted to Owner for approval. Customer will be notified once approved.`,
        priceVersion,
        approvalId: approvalRecord.id,
        status: job.status, // Job remains in current status until owner approves
      });
    }
  } catch (err) {
    next(err);
  }
});

// ── 4. GET /api/repairer/jobs ──────────────────────────────────
// Returns claimed jobs for this repairer
router.get('/jobs', async (req, res, next) => {
  try {
    const { status } = req.query;
    const isOwner = req.user.role === ROLES.OWNER;

    const conditions = [];
    const params = [];
    let p = 1;

    if (!isOwner) {
      conditions.push(`j.assigned_repairer = $${p++}`);
      params.push(req.user.id);
    }

    if (status) {
      conditions.push(`j.status = $${p++}`);
      params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const r = await db.query(
      `SELECT
         j.id,
         j.job_number,
         j.status,
         j.payment_status,
         j.shoe_brand,
         j.shoe_color,
         j.registered_at,
         j.received_at,
         j.started_at,
         j.completed_at,
         SPLIT_PART(c.name, ' ', 1) AS customer_first_name,
         sc.name AS service_name,
         sc.min_price AS catalog_min_price,
         sc.max_price AS catalog_max_price,
         pv.amount AS current_price,
         pv.customer_response AS price_customer_response,
         (SELECT COUNT(*) FROM photos p WHERE p.job_id = j.id AND p.type = 'completion')::int AS completion_photo_count
       FROM jobs j
       JOIN customers c ON j.customer_id = c.id
       JOIN service_catalog sc ON j.service_id = sc.id
       LEFT JOIN LATERAL (
         SELECT amount, customer_response
         FROM price_versions
         WHERE job_id = j.id
         ORDER BY version_number DESC
         LIMIT 1
       ) pv ON TRUE
       ${where}
       ORDER BY j.updated_at DESC`,
      params
    );

    res.json({ jobs: r.rows });
  } catch (err) {
    next(err);
  }
});

// ── 5. GET /api/repairer/jobs/:id ──────────────────────────────
// Full job detail for repairer (privacy enforced: first name only, no customer phone)
router.get('/jobs/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const r = await db.query(
      `SELECT
         j.id,
         j.job_number,
         j.status,
         j.payment_status,
         j.channel,
         j.shoe_brand,
         j.shoe_color,
         j.notes,
         j.registered_at,
         j.received_at,
         j.started_at,
         j.completed_at,
         j.picked_at,
         j.assigned_repairer,
         SPLIT_PART(c.name, ' ', 1) AS customer_first_name,
         sc.name AS service_name,
         sc.min_price AS catalog_min_price,
         sc.max_price AS catalog_max_price,
         u_rec.name AS received_by_name,
         u_rep.name AS assigned_repairer_name
       FROM jobs j
       JOIN customers c ON j.customer_id = c.id
       JOIN service_catalog sc ON j.service_id = sc.id
       LEFT JOIN users u_rec ON j.received_by = u_rec.id
       LEFT JOIN users u_rep ON j.assigned_repairer = u_rep.id
       WHERE j.id = $1`,
      [id]
    );

    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const job = r.rows[0];

    // Privacy/permission: Only assigned repairer or owner can inspect
    if (job.assigned_repairer !== req.user.id && req.user.role !== ROLES.OWNER) {
      return res.status(403).json({ error: 'You are not assigned to this job.' });
    }

    const [photos, priceVersions, timeline] = await Promise.all([
      Photo.getPhotosForJob(id),
      Price.getHistoryForJob(id),
      getJobTimeline(id),
    ]);

    res.json({
      job,
      photos,
      priceVersions,
      timeline,
    });
  } catch (err) {
    next(err);
  }
});

// ── 6. PATCH /api/repairer/jobs/:id/status ──────────────────────
// Status update: Started -> Completed, Started -> On Hold, On Hold -> Started
router.patch('/jobs/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, hold_reason, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Target status is required.' });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    if (job.assigned_repairer !== req.user.id && req.user.role !== ROLES.OWNER) {
      return res.status(403).json({ error: 'You are not assigned to this job.' });
    }

    // State machine check
    assertTransition(job.status, status, req.user.role);

    if (status === JOB_STATUS.ON_HOLD && (!hold_reason || !hold_reason.trim())) {
      return res.status(400).json({ error: 'Please specify a reason when placing a job on hold.' });
    }

    let updatedJobNotes = job.notes || '';
    if (status === JOB_STATUS.ON_HOLD) {
      updatedJobNotes = [updatedJobNotes, `[On Hold]: ${hold_reason}`].filter(Boolean).join('\n');
    }
    if (notes) {
      updatedJobNotes = [updatedJobNotes, `[Note]: ${notes}`].filter(Boolean).join('\n');
    }

    await db.withTransaction(async (client) => {
      const completedClause = status === JOB_STATUS.COMPLETED ? ', completed_at = NOW()' : '';

      await client.query(
        `UPDATE jobs
         SET status = $1,
             notes = $2,
             updated_at = NOW()
             ${completedClause}
         WHERE id = $3`,
        [status, updatedJobNotes, id]
      );

      await logEvent({
        jobId: id,
        actorUserId: req.user.id,
        actorLabel: req.user.name,
        eventType: AUDIT_EVENT.STATUS_CHANGED,
        oldValue: { status: job.status },
        newValue: { status },
        notes: status === JOB_STATUS.ON_HOLD
          ? `Placed on hold by ${req.user.name}. Reason: ${hold_reason}`
          : `Status changed to ${status} by ${req.user.name}.`,
        client,
      });
    });

    // If completed: calculate balance and send "shoes ready" SMS
    if (status === JOB_STATUS.COMPLETED && job.customer_phone) {
      const [priceRes, payRes] = await Promise.all([
        db.query(
          `SELECT amount FROM price_versions WHERE job_id = $1 ORDER BY version_number DESC LIMIT 1`,
          [id]
        ),
        db.query(
          `SELECT
             COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE -amount END), 0) AS total_paid
           FROM payments WHERE job_id = $1`,
          [id]
        ),
      ]);

      const price = priceRes.rows[0]?.amount ? parseFloat(priceRes.rows[0].amount) : 0;
      const totalPaid = payRes.rows[0]?.total_paid ? parseFloat(payRes.rows[0].total_paid) : 0;
      const balance = Math.max(0, price - totalPaid);

      await smsService.sendJobCompleted(job.customer_phone, job.job_number, balance);
    }

    logger.info('Repairer updated job status', {
      jobId: id,
      jobNumber: job.job_number,
      oldStatus: job.status,
      newStatus: status,
      repairer: req.user.name,
    });

    const updatedJob = await Job.findById(id);
    res.json({
      success: true,
      message: `Job ${job.job_number} status updated to '${status}'.`,
      job: updatedJob,
    });
  } catch (err) {
    next(err);
  }
});

// ── 7. POST /api/repairer/jobs/:id/completion-photos ───────────
// Upload completion photos (after repair work is done)
router.post('/jobs/:id/completion-photos', upload.array('photos', 5), async (req, res, next) => {
  try {
    const { id } = req.params;

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    if (job.assigned_repairer !== req.user.id && req.user.role !== ROLES.OWNER) {
      return res.status(403).json({ error: 'You are not assigned to this job.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Please select at least one completion photo to upload.' });
    }

    const savedPhotos = [];
    for (const file of req.files) {
      const fileUrl = await saveCompressedPhoto(file.buffer, id, 'completion');
      const photoRecord = await Photo.addPhoto({
        job_id: id,
        type: PHOTO_TYPE.COMPLETION,
        file_url: fileUrl,
        taken_by: req.user.id,
      });
      savedPhotos.push(photoRecord);
    }

    await logEvent({
      jobId: id,
      actorUserId: req.user.id,
      actorLabel: req.user.name,
      eventType: AUDIT_EVENT.PHOTO_UPLOADED,
      newValue: { photo_count: savedPhotos.length, type: PHOTO_TYPE.COMPLETION },
      notes: `${savedPhotos.length} completion photo(s) uploaded by repairer ${req.user.name}.`,
    });

    res.status(201).json({
      success: true,
      message: `${savedPhotos.length} completion photo(s) uploaded successfully.`,
      photos: savedPhotos,
    });
  } catch (err) {
    next(err);
  }
});

// ── 8. GET /api/repairer/activity ──────────────────────────────
// Personal repairer stats and performance metrics
router.get('/activity', async (req, res, next) => {
  try {
    const repairerId = req.user.id;

    const [statsResult, recentResult] = await Promise.all([
      db.query(
        `SELECT
           COUNT(*)::int AS total_assigned,
           COUNT(*) FILTER (WHERE status = 'Started')::int AS in_progress_count,
           COUNT(*) FILTER (WHERE status = 'On Hold')::int AS on_hold_count,
           COUNT(*) FILTER (WHERE status = 'Awaiting Confirmation')::int AS awaiting_confirmation_count,
           COUNT(*) FILTER (WHERE status = 'Completed' AND DATE(completed_at) = CURRENT_DATE)::int AS completed_today,
           COUNT(*) FILTER (WHERE status = 'Completed' AND completed_at >= NOW() - INTERVAL '7 days')::int AS completed_this_week,
           COUNT(*) FILTER (WHERE status IN ('Completed', 'Picked'))::int AS total_completed
         FROM jobs
         WHERE assigned_repairer = $1`,
        [repairerId]
      ),
      db.query(
        `SELECT
           j.id,
           j.job_number,
           j.status,
           j.shoe_brand,
           j.shoe_color,
           j.updated_at,
           j.completed_at,
           sc.name AS service_name,
           pv.amount AS agreed_price
         FROM jobs j
         JOIN service_catalog sc ON j.service_id = sc.id
         LEFT JOIN LATERAL (
           SELECT amount FROM price_versions WHERE job_id = j.id ORDER BY version_number DESC LIMIT 1
         ) pv ON TRUE
         WHERE j.assigned_repairer = $1
         ORDER BY j.updated_at DESC
         LIMIT 15`,
        [repairerId]
      ),
    ]);

    res.json({
      stats: statsResult.rows[0],
      recentJobs: recentResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
