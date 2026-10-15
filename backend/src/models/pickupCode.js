'use strict';
/**
 * pickupCode.js — Model for hashed customer pickup OTPs.
 *
 * Rules (SRS SEC-05, OTP-01 to OTP-04):
 *  - Plain text code is ONLY ever passed to SMS service.
 *  - Database stores ONLY bcrypt hash.
 *  - 3 incorrect attempts locks the code.
 *  - Expires after 24 hours.
 */

const bcrypt = require('bcrypt');
const db = require('../config/db');
const { generateNumericCode } = require('../utils/token');
const { DEFAULTS } = require('../config/constants');

class PickupCode {
  /**
   * Generates a 6-digit OTP, stores its bcrypt hash, and returns plainCode
   * exclusively for immediate SMS dispatch.
   */
  static async createCode(jobId, client = null) {
    const q = client ? client.query.bind(client) : db.query.bind(db);

    // Invalidate any older unused codes for this job
    await q(
      `UPDATE pickup_codes
       SET used = TRUE
       WHERE job_id = $1 AND used = FALSE`,
      [jobId]
    );

    const plainCode = generateNumericCode(6);
    const saltRounds = 10;
    const codeHash = await bcrypt.hash(plainCode, saltRounds);

    const res = await q(
      `INSERT INTO pickup_codes (job_id, code_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '24 hours')
       RETURNING id, job_id, expires_at, created_at`,
      [jobId, codeHash]
    );

    return {
      record: res.rows[0],
      plainCode, // Must NEVER be returned to API clients
    };
  }

  /**
   * Fetch current active code record for job.
   */
  static async getActiveRecord(jobId, client = null) {
    const q = client ? client.query.bind(client) : db.query.bind(db);
    const res = await q(
      `SELECT *
       FROM pickup_codes
       WHERE job_id = $1 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [jobId]
    );
    return res.rows[0] || null;
  }

  /**
   * Verify verbal OTP entered by staff.
   */
  static async verifyCode(jobId, inputCode, client = null) {
    const q = client ? client.query.bind(client) : db.query.bind(db);

    const record = await PickupCode.getActiveRecord(jobId, client);
    if (!record) {
      return {
        success: false,
        status: 'EXPIRED_OR_NOT_FOUND',
        message: 'No active pickup code found or code has expired. Please request a new code.',
      };
    }

    if (record.attempts >= DEFAULTS.OTP_MAX_ATTEMPTS) {
      return {
        success: false,
        status: 'LOCKED',
        message: 'Code is locked due to too many failed attempts. Please re-issue code or request owner override.',
        attempts: record.attempts,
      };
    }

    const isMatch = await bcrypt.compare(inputCode.trim(), record.code_hash);

    if (isMatch) {
      // Mark code as used
      await q(
        `UPDATE pickup_codes
         SET used = TRUE
         WHERE id = $1`,
        [record.id]
      );

      return {
        success: true,
        status: 'VERIFIED',
      };
    } else {
      // Increment attempts
      const updRes = await q(
        `UPDATE pickup_codes
         SET attempts = attempts + 1
         WHERE id = $1
         RETURNING attempts`,
        [record.id]
      );

      const attempts = updRes.rows[0].attempts;
      const remaining = Math.max(0, DEFAULTS.OTP_MAX_ATTEMPTS - attempts);
      const isLocked = attempts >= DEFAULTS.OTP_MAX_ATTEMPTS;

      return {
        success: false,
        status: isLocked ? 'LOCKED' : 'INVALID_CODE',
        message: isLocked
          ? 'Too many incorrect attempts. Code is now locked.'
          : `Invalid pickup code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
        attempts,
        remaining,
        isLocked,
      };
    }
  }

  /**
   * Explicitly invalidate all active codes for a job.
   */
  static async invalidateCodes(jobId, client = null) {
    const q = client ? client.query.bind(client) : db.query.bind(db);
    await q(
      `UPDATE pickup_codes
       SET used = TRUE
       WHERE job_id = $1 AND used = FALSE`,
      [jobId]
    );
  }
}

module.exports = PickupCode;
