'use strict';
/**
 * approval.js — Data access model for owner approvals.
 * Types: out_of_band_price, pickup_override, alternate_identifier, status_reversal.
 */

const db = require('../config/db');
const { APPROVAL_DECISION } = require('../config/constants');

class Approval {
  /**
   * Create a new approval request.
   */
  static async createRequest({ jobId, type, requestedBy, reason }, client = null) {
    const q = client ? client.query.bind(client) : db.query.bind(db);
    const res = await q(
      `INSERT INTO approvals (job_id, type, requested_by, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [jobId, type, requestedBy, reason]
    );
    return res.rows[0];
  }

  /**
   * Find pending approvals.
   */
  static async getPending(type = null) {
    const conditions = ['a.decision IS NULL'];
    const params = [];

    if (type) {
      conditions.push('a.type = $1');
      params.push(type);
    }

    const res = await db.query(
      `SELECT
         a.*,
         j.job_number,
         j.status AS job_status,
         j.shoe_brand,
         j.shoe_color,
         c.name AS customer_name,
         c.phone AS customer_phone,
         sc.name AS service_name,
         sc.min_price AS catalog_min_price,
         sc.max_price AS catalog_max_price,
         u_req.name AS requested_by_name,
         u_req.role AS requested_by_role,
         pv.amount AS proposed_amount,
         pv.version_number AS price_version_number
       FROM approvals a
       JOIN jobs j ON a.job_id = j.id
       JOIN customers c ON j.customer_id = c.id
       JOIN service_catalog sc ON j.service_id = sc.id
       JOIN users u_req ON a.requested_by = u_req.id
       LEFT JOIN LATERAL (
         SELECT amount, version_number FROM price_versions WHERE job_id = j.id ORDER BY version_number DESC LIMIT 1
       ) pv ON TRUE
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.requested_at ASC`,
      params
    );

    return res.rows;
  }

  /**
   * Find approval by ID.
   */
  static async findById(id, client = null) {
    const q = client ? client.query.bind(client) : db.query.bind(db);
    const res = await q(
      `SELECT a.*, j.job_number, j.status AS job_status
       FROM approvals a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  /**
   * Record owner decision (approved or rejected).
   */
  static async recordDecision({ id, decidedBy, decision, reason }, client = null) {
    const q = client ? client.query.bind(client) : db.query.bind(db);
    const res = await q(
      `UPDATE approvals
       SET decided_by = $1,
           decision = $2,
           reason = COALESCE($3, reason),
           decided_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [decidedBy, decision, reason, id]
    );
    return res.rows[0] || null;
  }
}

module.exports = Approval;
