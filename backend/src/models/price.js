'use strict';
/**
 * price.js — Data access model for price versions.
 *
 * Rules:
 *  - Append-only. Price versions are never deleted or overwritten.
 *  - version_number increments sequentially per job.
 *  - Out-of-band prices require owner approval before customer confirmation.
 */

const db = require('../config/db');

class Price {
  /**
   * Propose a new price version for a job.
   * Increments version_number atomically.
   */
  static async proposePrice({ jobId, amount, proposedBy }, client = null) {
    const q = client ? client.query.bind(client) : db.query.bind(db);

    // Compute next version number for this job
    const vRes = await q(
      `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
       FROM price_versions
       WHERE job_id = $1`,
      [jobId]
    );
    const nextVersion = vRes.rows[0].next_version;

    const res = await q(
      `INSERT INTO price_versions (job_id, version_number, amount, proposed_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [jobId, nextVersion, amount, proposedBy]
    );

    return res.rows[0];
  }

  /**
   * Fetch the latest price version for a job.
   */
  static async getLatestForJob(jobId, client = null) {
    const q = client ? client.query.bind(client) : db.query.bind(db);
    const res = await q(
      `SELECT pv.*, u.name AS proposed_by_name, u_app.name AS approved_by_name
       FROM price_versions pv
       JOIN users u ON pv.proposed_by = u.id
       LEFT JOIN users u_app ON pv.approved_by = u_app.id
       WHERE pv.job_id = $1
       ORDER BY pv.version_number DESC
       LIMIT 1`,
      [jobId]
    );
    return res.rows[0] || null;
  }

  /**
   * Fetch full price history for a job.
   */
  static async getHistoryForJob(jobId, client = null) {
    const q = client ? client.query.bind(client) : db.query.bind(db);
    const res = await q(
      `SELECT pv.*, u.name AS proposed_by_name, u_app.name AS approved_by_name
       FROM price_versions pv
       JOIN users u ON pv.proposed_by = u.id
       LEFT JOIN users u_app ON pv.approved_by = u_app.id
       WHERE pv.job_id = $1
       ORDER BY pv.version_number ASC`,
      [jobId]
    );
    return res.rows;
  }

  /**
   * Record customer confirmation or decline.
   */
  static async recordCustomerResponse({ jobId, versionNumber, response }, client = null) {
    const q = client ? client.query.bind(client) : db.query.bind(db);
    const res = await q(
      `UPDATE price_versions
       SET customer_response = $1,
           responded_at = NOW()
       WHERE job_id = $2 AND version_number = $3
       RETURNING *`,
      [response, jobId, versionNumber]
    );
    return res.rows[0] || null;
  }

  /**
   * Record owner approval for an out-of-band price.
   */
  static async recordOwnerApproval({ jobId, versionNumber, approvedBy }, client = null) {
    const q = client ? client.query.bind(client) : db.query.bind(db);
    const res = await q(
      `UPDATE price_versions
       SET approved_by = $1
       WHERE job_id = $2 AND version_number = $3
       RETURNING *`,
      [approvedBy, jobId, versionNumber]
    );
    return res.rows[0] || null;
  }
}

module.exports = Price;
