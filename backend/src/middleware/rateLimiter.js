'use strict';
/**
 * rateLimiter.js — Configurable rate limiters for different route groups.
 * Using express-rate-limit v7+.
 */

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

/**
 * Standard JSON response for rate-limit exceeded responses.
 */
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    error: 'Too many requests. Please wait a moment and try again.',
    retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() - Date.now()) / 1000) || 60,
  });
};

// ── Global API limiter (applied to all /api routes) ───────────
// 200 requests per 15 minutes in production; 2000 in dev
const globalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             env.IS_PROD ? 200 : 2000,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  validate:        { ip: false, xForwardedForHeader: false },
});

// ── Registration limiter (customer self-registration) ─────────
// 5 registrations per hour per IP (prevent spam)
const registrationLimiter = rateLimit({
  windowMs:        60 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  validate:        { ip: false, xForwardedForHeader: false },
});

// ── OTP / phone verification limiter ─────────────────────────
// 3 OTP sends per 15 minutes per phone number
const otpLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             3,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  keyGenerator:    (req) => req.body?.phone || req.ip || 'anonymous',
  validate:        { keyGeneratorIpFallback: false, ip: false, xForwardedForHeader: false },
});

// ── Login limiter ─────────────────────────────────────────────
// 10 attempts per 15 minutes per IP (account lockout is separate)
const loginLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  validate:        { ip: false, xForwardedForHeader: false },
});

// ── Pickup code verification limiter ─────────────────────────
// 5 verifications per 5 minutes per IP
const pickupLimiter = rateLimit({
  windowMs:        5 * 60 * 1000,
  max:             5,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler,
  validate:        { ip: false, xForwardedForHeader: false },
});

module.exports = {
  globalLimiter,
  registrationLimiter,
  otpLimiter,
  loginLimiter,
  pickupLimiter,
};
