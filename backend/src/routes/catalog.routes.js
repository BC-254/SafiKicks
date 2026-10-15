'use strict';
/**
 * catalog.routes.js — Service catalog API endpoints.
 * Public endpoint: GET /api/catalog
 */

const express = require('express');
const router = express.Router();
const ServiceCatalog = require('../models/serviceCatalog');

// ── GET /api/catalog ──────────────────────────────────────────
// Public endpoint for customer registration portal & general inquiries
router.get('/', async (req, res, next) => {
  try {
    const services = await ServiceCatalog.listActive();
    res.json({ services });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
