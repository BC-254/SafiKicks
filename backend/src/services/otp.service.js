'use strict';
/**
 * otp.service.js — One-time password generation, hashing, and verification.
 *
 * SRS SEC-05: Codes are generated with a cryptographically secure generator,
 * stored hashed, and protected by rate limits on sending and verification.
 *
 * Two code types share this service:
 *  1. Phone verification codes (registration OTP)
 *  2. Pickup codes (shoe release OTP)
 *
 * CRITICAL: The plain-text code is NEVER stored anywhere. Only the bcrypt
 * hash lives in the database. The only path from code → customer is SMS.
 */

const bcrypt   = require('bcrypt');
const env      = require('../config/env');
const { generateNumericCode } = require('../utils/token');

// ── generateOTP ───────────────────────────────────────────────
/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt internally (see token.js) — no modulo bias.
 * @returns {string} 6-digit zero-padded string e.g. "042817"
 */
const generateOTP = () => generateNumericCode(6);

// ── hashOTP ───────────────────────────────────────────────────
/**
 * Hash an OTP with bcrypt for storage.
 * We use a slightly lower round count (10) vs passwords (12)
 * because OTPs are short-lived and high-frequency.
 * @param {string} code - plain text OTP
 * @returns {Promise<string>} bcrypt hash
 */
const hashOTP = async (code) => {
  const rounds = Math.max(10, env.BCRYPT_ROUNDS - 2);
  return bcrypt.hash(code, rounds);
};

// ── verifyOTP ─────────────────────────────────────────────────
/**
 * Compare a submitted OTP against its stored hash.
 * Returns false (not throw) on mismatch — let the caller manage attempts.
 * @param {string} submittedCode - plain text code entered by user
 * @param {string} storedHash    - bcrypt hash from DB
 * @returns {Promise<boolean>}
 */
const verifyOTP = async (submittedCode, storedHash) => {
  try {
    return await bcrypt.compare(String(submittedCode).trim(), storedHash);
  } catch {
    return false;
  }
};

// ── generateAndHash ───────────────────────────────────────────
/**
 * Convenience: generate a fresh OTP and its hash in one call.
 * Returns { code, hash } — persist only hash, send only code via SMS.
 * @returns {Promise<{ code: string, hash: string }>}
 */
const generateAndHash = async () => {
  const code = generateOTP();
  const hash = await hashOTP(code);
  return { code, hash };
};

// ── expiryDate helpers ────────────────────────────────────────
/**
 * Return a Date object `minutes` from now (for phone verification codes).
 */
const otpExpiryDate = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + env.OTP_EXPIRY_MINUTES);
  return d;
};

/**
 * Return a Date object `hours` from now (for pickup codes).
 */
const pickupCodeExpiryDate = () => {
  const d = new Date();
  d.setHours(d.getHours() + env.PICKUP_CODE_EXPIRY_HOURS);
  return d;
};

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTP,
  generateAndHash,
  otpExpiryDate,
  pickupCodeExpiryDate,
};
