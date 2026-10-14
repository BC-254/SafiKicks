'use strict';
/**
 * rateLimiter.js — Configurable rate limiters for different route groups.
 * Using express-rate-limit v7+.
 * 
 * Usage:
 *   const { globalLimiter, registrationLimiter, otpLimiter } = require('./rateLimiter');
 *   router.post('/verify-phone', otpLimiter, handler);
 */

const rateLimit = require('express-rate-limit');

/**
 * Standard JSON response for rate-limit exceeded responses.
 */
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    error: 'Too many requests. Please wait a moment and try again.',
    retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
  });
};

// ── Global API limiter (applied to all /api routes) ───────────
// 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             200,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  keyGenerator:    (req) => req.ip,
});

// ── Registration limiter (customer self-registration) ─────────
// 5 registrations per hour per IP (prevent spam)
const registrationLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  keyGenerator:    (req) => req.ip,
});

// ── OTP / phone verification limiter ─────────────────────────
// 3 OTP sends per 15 minutes per phone number
const otpLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             3,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  keyGenerator:    (req) => req.body?.phone || req.ip,
});

// ── Login limiter ─────────────────────────────────────────────
// 10 attempts per 15 minutes per IP (account lockout is separate)
const loginLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  keyGenerator:    (req) => req.ip,
});

// ── Pickup code verification limiter ─────────────────────────
// 5 verifications per 5 minutes per IP
// (lockout after 3 attempts is enforced by business logic separately)
const pickupLimiter = rateLimit({
  windowMs:        5 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  keyGenerator:    (req) => req.ip,
});

module.exports = {
  globalLimiter,
  registrationLimiter,
  otpLimiter,
  loginLimiter,
  pickupLimiter,
};
