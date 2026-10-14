'use strict';
/**
 * auth.js — JWT authentication and role-based access control middleware.
 *
 * Usage:
 *   router.get('/protected', authenticate, requireRole('owner'), handler)
 *   router.get('/staff',     authenticate, requireRole('counter_staff', 'repairer', 'owner'), handler)
 *
 * Token format (JWT payload):
 *   { id, name, role, iat, exp }
 *
 * SRS SEC-02: Role permissions are enforced in the backend, not only in the UI.
 */

const jwt     = require('jsonwebtoken');
const env     = require('../config/env');
const logger  = require('../utils/logger');
const { AuthorizationError } = require('./errorHandler');

// ── authenticate ──────────────────────────────────────────────
/**
 * Verifies the JWT in the Authorization header.
 * On success, attaches `req.user = { id, name, role }`.
 * On failure, responds 401 immediately.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = {
      id:   payload.id,
      name: payload.name,
      role: payload.role,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    logger.warn('Invalid JWT', { error: err.message, ip: req.ip });
    return res.status(401).json({ error: 'Invalid authentication token.' });
  }
};

// ── requireRole ───────────────────────────────────────────────
/**
 * Returns middleware that restricts access to the given role(s).
 * Must be used AFTER `authenticate`.
 *
 * @param {...string} roles - one or more of 'counter_staff' | 'repairer' | 'owner'
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    // Defensive check — should never happen if authenticate ran first
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (!roles.includes(req.user.role)) {
    logger.warn('Authorization denied', {
      userId: req.user.id,
      userRole: req.user.role,
      required: roles,
      path: req.originalUrl,
    });
    return next(new AuthorizationError(
      `Access denied. Requires role: ${roles.join(' or ')}.`
    ));
  }

  next();
};

// ── generateToken ─────────────────────────────────────────────
/**
 * Sign a JWT for a staff user.
 * @param {{ id, name, role }} user
 * @returns {string} signed JWT
 */
const generateToken = (user) =>
  jwt.sign(
    { id: user.id, name: user.name, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

/**
 * Sign a short-lived token for phone verification sessions.
 * Payload carries only the verified phone — no role, no staff access.
 * @param {string} phone
 * @returns {string} signed JWT
 */
const generatePhoneSessionToken = (phone) =>
  jwt.sign(
    { phone, type: 'phone_session' },
    env.JWT_SECRET,
    { expiresIn: env.PHONE_SESSION_EXPIRES_IN }
  );

/**
 * Verify a phone session token (used during job registration step 2).
 * Returns the phone on success, throws on failure.
 * @param {string} token
 * @returns {{ phone: string }}
 */
const verifyPhoneSession = (token) => {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (payload.type !== 'phone_session') {
    throw new Error('Invalid token type');
  }
  return { phone: payload.phone };
};

module.exports = {
  authenticate,
  requireRole,
  generateToken,
  generatePhoneSessionToken,
  verifyPhoneSession,
};
