'use strict';
/**
 * job.js — Core Job database model.
 * Enforces job number format, unguessable access tokens, 48-hour registration expiry,
 * and immutable state tracking.
 */

const db = require('../config/db');
const { generateSecureToken, generateJobNumber } = require('../utils/token');
const { JOB_STATUS, PAYMENT_STATUS, CHANNEL, AUDIT_EVENT } = require('../config/constants');
const { logEvent } = require('./auditLog');

// ── createJob ─────────────────────────────────────────────────
/**
 * Create a new registered shoe repair job.
 * @param {object} param
 * @param {string} param.customer_id
 * @param {string} param.service_id
 * @param {string} [param.shoe_brand]
 * @param {string} [param.shoe_color]
 * @param {string} [param.notes]
 * @param {string} [param.channel='self_registered']
 * @param {string} [param.received_by]
 * @param {object} [client] - transaction client
 * @returns {Promise<object>}
 */
const createJob = async ({
  customer_id,
  service_id,
  shoe_brand = null,
  shoe_color = null,
  notes = null,
  channel = CHANNEL.SELF_REGISTERED,
  received_by = null,
}, client = null) => {
  const execute = client ? (q, p) => client.query(q, p) : db.query;

  const jobNumber = await generateJobNumber();
  const accessToken = generateSecureToken(32); // 64 hex characters

  const r = await execute(
    `INSERT INTO jobs (
       job_number, access_token, customer_id, service_id,
       shoe_brand, shoe_color, notes, status, payment_status,
       channel, received_by, registered_at, expires_at
     )
     VALUES (
       $1, $2, $3, $4,
       $5, $6, $7, $8, $9,
       $10, $11, NOW(), NOW() + INTERVAL '48 hours'
     )
     RETURNING id, job_number, access_token, customer_id, service_id,
               shoe_brand, shoe_color, notes, status, payment_status,
               channel, registered_at, expires_at`,
    [
      jobNumber,
      accessToken,
      customer_id,
      service_id,
      shoe_brand ? shoe_brand.trim() : null,
      shoe_color ? shoe_color.trim() : null,
      notes ? notes.trim() : null,
      JOB_STATUS.REGISTERED,
      PAYMENT_STATUS.UNPAID,
      channel,
      received_by,
    ]
  );

  return r.rows[0];
};

// ── findByAccessToken (Public Tracking Portal) ────────────────
/**
 * Fetch job by public access token. Personal data is minimized.
 * @param {string} token
 * @returns {Promise<object|null>}
 */
const findByAccessToken = async (token) => {
  const r = await db.query(
    `SELECT
       j.id,
       j.job_number,
       j.access_token,
       j.status,
       j.payment_status,
       j.shoe_brand,
       j.shoe_color,
       j.notes,
       j.registered_at,
       j.received_at,
       j.started_at,
       j.completed_at,
       j.picked_at,
       j.expires_at,
       c.name AS customer_name,
       c.phone AS customer_phone,
       sc.name AS service_name,
       sc.min_price AS catalog_min_price,
       sc.max_price AS catalog_max_price,
       pv.amount AS current_price,
       pv.customer_response AS price_response,
       COALESCE(
         (SELECT SUM(CASE WHEN p.type = 'payment' THEN p.amount ELSE -p.amount END)
          FROM payments p WHERE p.job_id = j.id),
         0
       ) AS total_paid
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
     WHERE j.access_token = $1`,
    [token.trim()]
  );

  if (!r.rows[0]) return null;

  const row = r.rows[0];
  const currentPrice = row.current_price != null ? Number(row.current_price) : null;
  const totalPaid = Number(row.total_paid);
  const balanceDue = currentPrice != null ? Math.max(0, currentPrice - totalPaid) : null;

  // Mask phone for public privacy: +254 7*** **78
  let maskedPhone = row.customer_phone;
  if (maskedPhone && maskedPhone.length > 7) {
    maskedPhone = maskedPhone.slice(0, 5) + '••••' + maskedPhone.slice(-2);
  }

  return {
    ...row,
    customer_phone_masked: maskedPhone,
    customer_phone: undefined, // do not expose raw phone
    total_paid: totalPaid,
    balance_due: balanceDue,
  };
};

// ── findById ──────────────────────────────────────────────────
const findById = async (id) => {
  const r = await db.query(
    `SELECT
       j.*,
       c.name AS customer_name,
       c.phone AS customer_phone,
       sc.name AS service_name,
       sc.min_price AS catalog_min_price,
       sc.max_price AS catalog_max_price,
       u_rec.name AS received_by_name,
       u_rep.name AS assigned_repairer_name,
       COALESCE(
         (SELECT SUM(CASE WHEN p.type = 'payment' THEN p.amount ELSE -p.amount END)
          FROM payments p WHERE p.job_id = j.id),
         0
       ) AS total_paid,
       pv.amount AS current_price
     FROM jobs j
     JOIN customers c ON j.customer_id = c.id
     JOIN service_catalog sc ON j.service_id = sc.id
     LEFT JOIN users u_rec ON j.received_by = u_rec.id
     LEFT JOIN users u_rep ON j.assigned_repairer = u_rep.id
     LEFT JOIN LATERAL (
       SELECT amount
       FROM price_versions
       WHERE job_id = j.id
       ORDER BY version_number DESC
       LIMIT 1
     ) pv ON TRUE
     WHERE j.id = $1`,
    [id]
  );
  return r.rows[0] || null;
};

// ── expireStaleRegistrations ──────────────────────────────────
/**
 * Automatically transitions un-dropped registrations past 48 hours to 'Expired'.
 * Can be run as a periodic cron job or on startup.
 */
const expireStaleRegistrations = async () => {
  const stale = await db.query(
    `SELECT id, job_number
     FROM jobs
     WHERE status = $1 AND expires_at < NOW()`,
    [JOB_STATUS.REGISTERED]
  );

  if (stale.rows.length === 0) return 0;

  for (const row of stale.rows) {
    await db.query(
      `UPDATE jobs
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [JOB_STATUS.EXPIRED, row.id]
    );

    await logEvent({
      jobId: row.id,
      actorLabel: 'system',
      eventType: AUDIT_EVENT.STATUS_CHANGED,
      oldValue: { status: JOB_STATUS.REGISTERED },
      newValue: { status: JOB_STATUS.EXPIRED },
      notes: 'Registration expired (not handed over at counter within 48h).',
    });
  }

  return stale.rows.length;
};

module.exports = {
  createJob,
  findByAccessToken,
  findById,
  expireStaleRegistrations,
};
