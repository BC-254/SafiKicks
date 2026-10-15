'use strict';
/**
 * owner.routes.js — Owner-only endpoints.
 * Staff CRUD: POST/GET/PATCH /api/owner/staff
 * (Dashboard, approvals, reports etc. added in later milestones)
 */

const express  = require('express');
const router   = express.Router();

const { authenticate, requireRole } = require('../middleware/auth');
const { ROLES }  = require('../config/constants');
const User       = require('../models/user');
const logger     = require('../utils/logger');

// All routes in this file require owner role
router.use(authenticate, requireRole(ROLES.OWNER));

// ── GET /api/owner/staff ──────────────────────────────────────
router.get('/staff', async (req, res, next) => {
  try {
    const users = await User.listAll();
    res.json({ staff: users });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/owner/staff ─────────────────────────────────────
router.post('/staff', async (req, res, next) => {
  try {
    const { name, role, email, phone, password } = req.body;

    if (!name || !role || !email || !password) {
      return res.status(400).json({ error: 'name, role, email and password are required.' });
    }

    const validRoles = [ROLES.COUNTER_STAFF, ROLES.REPAIRER, ROLES.OWNER];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}.` });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const user = await User.create({ name, role, email, phone, password });

    logger.info('Staff account created', {
      createdBy: req.user.id,
      newUserId: user.id,
      role: user.role,
    });

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/owner/staff/:id ────────────────────────────────
router.patch('/staff/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, phone, active } = req.body;

    // Prevent owner from locking themselves out
    if (id === req.user.id && active === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account.' });
    }

    if (role) {
      const validRoles = [ROLES.COUNTER_STAFF, ROLES.REPAIRER, ROLES.OWNER];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role.` });
      }
    }

    const updated = await User.update(id, { name, role, phone, active });
    if (!updated) return res.status(404).json({ error: 'Staff member not found.' });

    logger.info('Staff account updated', {
      updatedBy: req.user.id,
      targetId: id,
      changes: { name, role, active },
    });

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
