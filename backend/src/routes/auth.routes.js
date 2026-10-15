'use strict';
/**
 * auth.routes.js — Authentication endpoints.
 * POST /api/auth/login   — staff login
 * POST /api/auth/logout  — session termination (client clears token)
 * GET  /api/auth/me      — return current user
 */

const express  = require('express');
const router   = express.Router();

const User              = require('../models/user');
const { generateToken } = require('../middleware/auth');
const { authenticate }  = require('../middleware/auth');
const { loginLimiter }  = require('../middleware/rateLimiter');
const { logEvent }      = require('../models/auditLog');
const { AUDIT_EVENT }   = require('../config/constants');
const env               = require('../config/env');
const logger            = require('../utils/logger');

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findByEmail(email);

    // Unknown user — same error as wrong password (prevent user enumeration)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Account disabled
    if (!user.active) {
      return res.status(403).json({ error: 'Account disabled. Contact the shop owner.' });
    }

    // Account locked
    if (User.isLocked(user)) {
      const unlockAt = new Date(user.locked_until);
      const minutesLeft = Math.ceil((unlockAt - new Date()) / 60000);
      return res.status(423).json({
        error: `Account temporarily locked. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
        lockedUntil: user.locked_until,
      });
    }

    // Verify password
    const valid = await User.verifyPassword(password, user.password_hash);

    if (!valid) {
      const attempts = await User.incrementFailedAttempts(user.id);
      if (attempts >= env.LOGIN_MAX_ATTEMPTS) {
        await User.lockUser(user.id, env.LOGIN_LOCKOUT_MINUTES);
        logger.warn('Account locked after failed attempts', { userId: user.id, email });
        return res.status(423).json({
          error: `Too many failed attempts. Account locked for ${env.LOGIN_LOCKOUT_MINUTES} minutes.`,
        });
      }
      const remaining = env.LOGIN_MAX_ATTEMPTS - attempts;
      return res.status(401).json({
        error: `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      });
    }

    // Success — reset failure count, issue token
    await User.resetFailedAttempts(user.id);
    const token = generateToken(user);

    logger.info('Staff login', { userId: user.id, role: user.role, ip: req.ip });

    res.json({
      token,
      user: {
        id:   user.id,
        name: user.name,
        role: user.role,
        email: user.email,
      },
    });

  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────
// Stateless JWT — the client discards the token.
// We log the logout event for audit purposes.
router.post('/logout', authenticate, async (req, res) => {
  logger.info('Staff logout', { userId: req.user.id, role: req.user.role });
  res.json({ message: 'Logged out successfully.' });
});

// ── GET /api/auth/me ──────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
