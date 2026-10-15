'use strict';
/**
 * serviceCatalog.js — Service catalog database model.
 * Handles services, approved price bands (min & max), and standard turnaround hours.
 */

const db = require('../config/db');

// ── listActive (for public registration dropdown) ────────────
const listActive = async () => {
  const r = await db.query(
    `SELECT id, name, min_price, max_price, standard_turnaround_hours, active
     FROM service_catalog
     WHERE active = TRUE
     ORDER BY
       CASE WHEN name = 'Other' THEN 2 ELSE 1 END,
       name ASC`
  );
  return r.rows;
};

// ── listAll (for owner management) ───────────────────────────
const listAll = async () => {
  const r = await db.query(
    `SELECT id, name, min_price, max_price, standard_turnaround_hours, active, created_at, updated_at
     FROM service_catalog
     ORDER BY
       CASE WHEN name = 'Other' THEN 2 ELSE 1 END,
       name ASC`
  );
  return r.rows;
};

// ── findById ──────────────────────────────────────────────────
const findById = async (id) => {
  const r = await db.query(
    `SELECT id, name, min_price, max_price, standard_turnaround_hours, active, created_at, updated_at
     FROM service_catalog
     WHERE id = $1`,
    [id]
  );
  return r.rows[0] || null;
};

// ── findByName ────────────────────────────────────────────────
const findByName = async (name) => {
  const r = await db.query(
    `SELECT id, name, min_price, max_price, standard_turnaround_hours, active
     FROM service_catalog
     WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))`,
    [name]
  );
  return r.rows[0] || null;
};

// ── create ────────────────────────────────────────────────────
const create = async ({ name, min_price, max_price = null, standard_turnaround_hours = null }) => {
  const r = await db.query(
    `INSERT INTO service_catalog (name, min_price, max_price, standard_turnaround_hours)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, min_price, max_price, standard_turnaround_hours, active, created_at`,
    [name.trim(), min_price, max_price, standard_turnaround_hours]
  );
  return r.rows[0];
};

// ── update ────────────────────────────────────────────────────
const update = async (id, { name, min_price, max_price, standard_turnaround_hours, active }) => {
  const fields = [];
  const values = [];
  let p = 1;

  if (name !== undefined) {
    fields.push(`name = $${p++}`);
    values.push(name.trim());
  }
  if (min_price !== undefined) {
    fields.push(`min_price = $${p++}`);
    values.push(min_price);
  }
  if (max_price !== undefined) {
    fields.push(`max_price = $${p++}`);
    values.push(max_price);
  }
  if (standard_turnaround_hours !== undefined) {
    fields.push(`standard_turnaround_hours = $${p++}`);
    values.push(standard_turnaround_hours);
  }
  if (active !== undefined) {
    fields.push(`active = $${p++}`);
    values.push(active);
  }

  if (fields.length === 0) return findById(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const r = await db.query(
    `UPDATE service_catalog SET ${fields.join(', ')}
     WHERE id = $${p}
     RETURNING id, name, min_price, max_price, standard_turnaround_hours, active, created_at, updated_at`,
    values
  );
  return r.rows[0] || null;
};

// ── softDelete ────────────────────────────────────────────────
const softDelete = async (id) => {
  const r = await db.query(
    `UPDATE service_catalog
     SET active = FALSE, updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, active`,
    [id]
  );
  return r.rows[0] || null;
};

// ── isWithinBand ──────────────────────────────────────────────
/**
 * Verify if a proposed amount falls within the approved band.
 * @param {object} service - service_catalog row
 * @param {number} amount
 * @returns {boolean}
 */
const isWithinBand = (service, amount) => {
  const num = Number(amount);
  if (isNaN(num) || num < 0) return false;
  const min = Number(service.min_price);
  if (num < min) return false;
  if (service.max_price != null) {
    const max = Number(service.max_price);
    if (num > max) return false;
  }
  return true;
};

module.exports = {
  listActive,
  listAll,
  findById,
  findByName,
  create,
  update,
  softDelete,
  isWithinBand,
};
