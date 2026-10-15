'use strict';
/**
 * receipt.routes.js — Counter staff intake, receipt, tagging, and photo documentation.
 * Roles allowed: 'counter_staff' | 'owner'
 */

const express = require('express');
const router = express.Router();

const db = require('../config/db');
const logger = require('../utils/logger');
const { authenticate, requireRole } = require('../middleware/auth');
const { ROLES, JOB_STATUS, AUDIT_EVENT, PHOTO_TYPE, CHANNEL } = require('../config/constants');
const { assertTransition } = require('../services/stateMachine');
const { upload, saveCompressedPhoto } = require('../services/photo.service');
const smsService = require('../services/sms.service');
const Job = require('../models/job');
const Customer = require('../models/customer');
const Photo = require('../models/photo');
const ServiceCatalog = require('../models/serviceCatalog');
const { logEvent, getJobTimeline } = require('../models/auditLog');
const { parsePagination, paginatedResponse } = require('../utils/pagination');

// Guard all counter routes
router.use(authenticate, requireRole(ROLES.COUNTER_STAFF, ROLES.OWNER));

// ── 1. GET /api/receipt/lookup ─────────────────────────────────
// Search for registered jobs by job number, customer phone, or customer name
router.get('/lookup', async (req, res, next) => {
  try {
    const { q, status } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters.' });
    }

    const queryTerm = `%${q.trim()}%`;
    const conditions = [
      `(j.job_number ILIKE $1 OR c.phone ILIKE $1 OR c.name ILIKE $1)`
    ];
    const params = [queryTerm];

    if (status) {
      conditions.push(`j.status = $2`);
      params.push(status);
    }

    const r = await db.query(
      `SELECT
         j.id,
         j.job_number,
         j.access_token,
         j.status,
         j.payment_status,
         j.channel,
         j.shoe_brand,
         j.shoe_color,
         j.notes,
         j.registered_at,
         j.received_at,
         j.expires_at,
         c.name AS customer_name,
         c.phone AS customer_phone,
         sc.name AS service_name,
         sc.min_price AS catalog_min_price,
         sc.max_price AS catalog_max_price,
         (SELECT COUNT(*) FROM photos p WHERE p.job_id = j.id)::int AS photo_count
       FROM jobs j
       JOIN customers c ON j.customer_id = c.id
       JOIN service_catalog sc ON j.service_id = sc.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY j.registered_at DESC
       LIMIT 20`,
      params
    );

    res.json({ jobs: r.rows });
  } catch (err) {
    next(err);
  }
});

// ── 2. POST /api/receipt/:jobId/receive ────────────────────────
// Mark shoes physically handed over at counter -> status moves to 'In Queue'
router.post('/:jobId/receive', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { pre_existing_damage, notes } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    // Validate transition via state machine
    assertTransition(job.status, JOB_STATUS.IN_QUEUE, req.user.role);

    const combinedNotes = [
      job.notes,
      pre_existing_damage ? `[Pre-existing condition]: ${pre_existing_damage}` : null,
      notes ? `[Intake note]: ${notes}` : null,
    ].filter(Boolean).join('\n');

    await db.withTransaction(async (client) => {
      await client.query(
        `UPDATE jobs
         SET status = $1,
             received_by = $2,
             received_at = NOW(),
             notes = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [JOB_STATUS.IN_QUEUE, req.user.id, combinedNotes, jobId]
      );

      await logEvent({
        jobId,
        actorUserId: req.user.id,
        actorLabel: req.user.name,
        eventType: AUDIT_EVENT.STATUS_CHANGED,
        oldValue: { status: job.status },
        newValue: { status: JOB_STATUS.IN_QUEUE },
        notes: `Physical handover confirmed & tagged by ${req.user.name}.${pre_existing_damage ? ' Condition noted.' : ''}`,
        client,
      });
    });

    logger.info('Job marked received at counter', {
      jobId,
      jobNumber: job.job_number,
      receivedBy: req.user.name,
    });

    const updatedJob = await Job.findById(jobId);
    res.json({
      success: true,
      message: `Job ${job.job_number} marked received and queued for inspection.`,
      job: updatedJob,
    });
  } catch (err) {
    next(err);
  }
});

// ── 3. POST /api/receipt/:jobId/photos ─────────────────────────
// Upload receipt condition photos (min 2 recommended, max 5)
router.post('/:jobId/photos', upload.array('photos', 5), async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Please select at least one photo to upload.' });
    }

    const savedPhotos = [];
    for (const file of req.files) {
      const fileUrl = await saveCompressedPhoto(file.buffer, jobId, 'intake');
      const photoRecord = await Photo.addPhoto({
        job_id: jobId,
        type: PHOTO_TYPE.RECEIPT,
        file_url: fileUrl,
        taken_by: req.user.id,
      });
      savedPhotos.push(photoRecord);
    }

    await logEvent({
      jobId,
      actorUserId: req.user.id,
      actorLabel: req.user.name,
      eventType: AUDIT_EVENT.PHOTO_UPLOADED,
      newValue: { photo_count: savedPhotos.length },
      notes: `${savedPhotos.length} intake condition photo(s) uploaded by ${req.user.name}.`,
    });

    res.status(201).json({
      success: true,
      message: `${savedPhotos.length} photo(s) uploaded successfully.`,
      photos: savedPhotos,
    });
  } catch (err) {
    next(err);
  }
});

// ── 4. POST /api/receipt/staff-job ─────────────────────────────
// Counter staff creates a job on behalf of walk-in customer
router.post('/staff-job', async (req, res, next) => {
  try {
    const {
      name,
      phone,
      alternate_identifier,
      service_id,
      shoe_brand,
      shoe_color,
      notes,
      pre_existing_damage,
      mark_received = true,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    if (!phone && !alternate_identifier) {
      return res.status(400).json({ error: 'Either customer phone or alternate identifier is required.' });
    }

    if (!service_id) {
      return res.status(400).json({ error: 'Please select a catalog service.' });
    }

    const service = await ServiceCatalog.findById(service_id);
    if (!service || !service.active) {
      return res.status(400).json({ error: 'Selected service is invalid or deactivated.' });
    }

    const combinedNotes = [
      notes,
      pre_existing_damage ? `[Pre-existing condition]: ${pre_existing_damage}` : null,
    ].filter(Boolean).join('\n');

    const result = await db.withTransaction(async (client) => {
      let customer;
      if (phone) {
        customer = await Customer.upsertByPhone({
          name,
          phone,
          consent_given: true,
        }, client);
      } else {
        customer = await Customer.createWithAlternate({
          name,
          alternate_identifier,
          approved_by: req.user.id,
        }, client);
      }

      const job = await Job.createJob({
        customer_id: customer.id,
        service_id: service.id,
        shoe_brand,
        shoe_color,
        notes: combinedNotes,
        channel: CHANNEL.STAFF_REGISTERED,
        received_by: mark_received ? req.user.id : null,
      }, client);

      if (mark_received) {
        await client.query(
          `UPDATE jobs
           SET status = $1,
               received_by = $2,
               received_at = NOW(),
               updated_at = NOW()
           WHERE id = $3`,
          [JOB_STATUS.IN_QUEUE, req.user.id, job.id]
        );
      }

      await logEvent({
        jobId: job.id,
        actorUserId: req.user.id,
        actorLabel: req.user.name,
        eventType: AUDIT_EVENT.STAFF_REGISTERED,
        newValue: {
          job_number: job.job_number,
          channel: CHANNEL.STAFF_REGISTERED,
          customer_name: customer.name,
          service: service.name,
          initial_status: mark_received ? JOB_STATUS.IN_QUEUE : JOB_STATUS.REGISTERED,
        },
        notes: `Staff-registered by ${req.user.name} on behalf of customer.`,
        client,
      });

      return { customer, job };
    });

    const { customer, job } = result;

    // Send SMS confirmation if phone available
    if (customer.phone) {
      await smsService.sendJobRegistered(customer.phone, job.job_number, job.access_token);
    }

    logger.info('Staff-registered job created', {
      jobNumber: job.job_number,
      createdBy: req.user.name,
    });

    const fullJob = await Job.findById(job.id);
    res.status(201).json({
      success: true,
      message: `Job ${job.job_number} created and tagged.`,
      job: fullJob,
    });
  } catch (err) {
    next(err);
  }
});

// ── 5. GET /api/receipt/jobs ───────────────────────────────────
// Directory of jobs with status filtering & pagination
router.get('/jobs', async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const conditions = [];
    const params = [];
    let p = 1;

    if (status) {
      conditions.push(`j.status = $${p++}`);
      params.push(status);
    }

    if (search) {
      conditions.push(`(j.job_number ILIKE $${p} OR c.name ILIKE $${p} OR c.phone ILIKE $${p})`);
      params.push(`%${search.trim()}%`);
      p++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataResult, countResult] = await Promise.all([
      db.query(
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
           c.name AS customer_name,
           c.phone AS customer_phone,
           sc.name AS service_name,
           sc.min_price AS catalog_min_price,
           sc.max_price AS catalog_max_price,
           u_rep.name AS assigned_repairer_name,
           pv.amount AS current_price
         FROM jobs j
         JOIN customers c ON j.customer_id = c.id
         JOIN service_catalog sc ON j.service_id = sc.id
         LEFT JOIN users u_rep ON j.assigned_repairer = u_rep.id
         LEFT JOIN LATERAL (
           SELECT amount FROM price_versions WHERE job_id = j.id ORDER BY version_number DESC LIMIT 1
         ) pv ON TRUE
         ${where}
         ORDER BY j.registered_at DESC
         LIMIT $${p} OFFSET $${p + 1}`,
        [...params, limit, offset]
      ),
      db.query(
        `SELECT COUNT(*)
         FROM jobs j
         JOIN customers c ON j.customer_id = c.id
         ${where}`,
        params
      ),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);
    res.json(paginatedResponse(dataResult.rows, total, page, limit));
  } catch (err) {
    next(err);
  }
});

// ── 6. GET /api/receipt/jobs/:id ───────────────────────────────
// Full job view for staff including photos and timeline
router.get('/jobs/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const [photos, timeline] = await Promise.all([
      Photo.getPhotosForJob(id),
      getJobTimeline(id),
    ]);

    res.json({
      job,
      photos,
      timeline,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
