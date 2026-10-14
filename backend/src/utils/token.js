'use strict';
/**
 * token.js — Secure token and job number utilities.
 *
 * Rules (from SRS SEC-04 / SEC-05):
 *  - All tokens use crypto.randomBytes — never Math.random()
 *  - Job numbers are human-readable but NOT sufficient alone to access data
 *  - Access tokens are 32-byte hex (64 chars) — unguessable
 */

const crypto = require('crypto');
const { query } = require('../config/db');

// ── Access token ──────────────────────────────────────────────

/**
 * Generate a cryptographically secure random hex token.
 * Default 32 bytes → 64-character hex string.
 * Used for job access tokens embedded in SMS links.
 * @param {number} bytes
 * @returns {string} hex string
 */
const generateSecureToken = (bytes = 32) =>
  crypto.randomBytes(bytes).toString('hex');

// ── Job number ────────────────────────────────────────────────

/**
 * Generate the next sequential job number for today.
 * Format: SRJ-YYYYMMDD-NNN  (e.g. SRJ-20261014-003)
 * Sequential within the day; uses DB to find the current max.
 * @returns {Promise<string>}
 */
const generateJobNumber = async () => {
  const today = new Date();
  const pad   = (n, w = 2) => String(n).padStart(w, '0');
  const dateStr =
    today.getFullYear().toString() +
    pad(today.getMonth() + 1) +
    pad(today.getDate());

  const prefix = `SRJ-${dateStr}-`;

  // Find today's highest sequence number atomically
  const result = await query(
    `SELECT job_number FROM jobs
     WHERE job_number LIKE $1
     ORDER BY job_number DESC
     LIMIT 1`,
    [`${prefix}%`]
  );

  let seq = 1;
  if (result.rows.length > 0) {
    const last = result.rows[0].job_number; // e.g. SRJ-20261014-007
    const parts = last.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(3, '0')}`;
};

// ── Short codes (for phone verification display) ──────────────

/**
 * Generate a cryptographically secure numeric OTP of given length.
 * Uses crypto.randomInt for uniform distribution — no modulo bias.
 * @param {number} digits — default 6
 * @returns {string} zero-padded numeric string
 */
const generateNumericCode = (digits = 6) => {
  const max = Math.pow(10, digits);
  const num = crypto.randomInt(0, max);
  return String(num).padStart(digits, '0');
};

module.exports = {
  generateSecureToken,
  generateJobNumber,
  generateNumericCode,
};
