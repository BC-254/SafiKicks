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

// ================================================================
// SERVICE CATALOG MANAGEMENT (OWNER)
// ================================================================

const ServiceCatalog = require('../models/serviceCatalog');

// ── GET /api/owner/catalog ────────────────────────────────────
router.get('/catalog', async (req, res, next) => {
  try {
    const services = await ServiceCatalog.listAll();
    res.json({ services });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/owner/catalog ───────────────────────────────────
router.post('/catalog', async (req, res, next) => {
  try {
    const { name, min_price, max_price, standard_turnaround_hours } = req.body;

    if (!name || min_price === undefined || min_price === null) {
      return res.status(400).json({ error: 'Service name and minimum price are required.' });
    }

    const min = Number(min_price);
    if (isNaN(min) || min < 0) {
      return res.status(400).json({ error: 'Minimum price must be a non-negative number.' });
    }

    let max = null;
    if (max_price !== undefined && max_price !== null && max_price !== '') {
      max = Number(max_price);
      if (isNaN(max) || max < min) {
        return res.status(400).json({ error: 'Maximum price must be greater than or equal to minimum price.' });
      }
    }

    const existing = await ServiceCatalog.findByName(name);
    if (existing) {
      return res.status(409).json({ error: 'A service with this name already exists in the catalog.' });
    }

    const hours = standard_turnaround_hours ? parseInt(standard_turnaround_hours, 10) : null;
    const service = await ServiceCatalog.create({
      name,
      min_price: min,
      max_price: max,
      standard_turnaround_hours: hours,
    });

    logger.info('Service catalog item created', {
      createdBy: req.user.id,
      serviceId: service.id,
      name: service.name,
    });

    res.status(201).json({ service });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/owner/catalog/:id ──────────────────────────────
router.patch('/catalog/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, min_price, max_price, standard_turnaround_hours, active } = req.body;

    const current = await ServiceCatalog.findById(id);
    if (!current) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (active !== undefined) updates.active = Boolean(active);
    if (standard_turnaround_hours !== undefined) {
      updates.standard_turnaround_hours = standard_turnaround_hours ? parseInt(standard_turnaround_hours, 10) : null;
    }

    if (min_price !== undefined) {
      const min = Number(min_price);
      if (isNaN(min) || min < 0) {
        return res.status(400).json({ error: 'Minimum price must be a non-negative number.' });
      }
      updates.min_price = min;
    }

    if (max_price !== undefined) {
      if (max_price === null || max_price === '') {
        updates.max_price = null;
      } else {
        const max = Number(max_price);
        const effectiveMin = updates.min_price !== undefined ? updates.min_price : Number(current.min_price);
        if (isNaN(max) || max < effectiveMin) {
          return res.status(400).json({ error: 'Maximum price must be greater than or equal to minimum price.' });
        }
        updates.max_price = max;
      }
    }

    const updated = await ServiceCatalog.update(id, updates);

    logger.info('Service catalog item updated', {
      updatedBy: req.user.id,
      serviceId: id,
      updates,
    });

    res.json({ service: updated });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/owner/catalog/:id (Soft Delete) ───────────────
router.delete('/catalog/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await ServiceCatalog.softDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Service not found.' });
    }

    logger.info('Service catalog item deactivated', {
      deactivatedBy: req.user.id,
      serviceId: id,
    });

    res.json({ message: 'Service successfully deactivated.', service: deleted });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
