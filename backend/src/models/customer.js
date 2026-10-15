'use strict';
/**
 * customer.js — Customer database model.
 * Customers are identified by verified phone numbers (or alternate identifiers approved by owner).
 */

const db = require('../config/db');

// ── findByPhone ───────────────────────────────────────────────
const findByPhone = async (phone) => {
  const r = await db.query(
    `SELECT id, name, phone, alternate_identifier, alternate_approved_by, consent_given, consent_at, created_at
     FROM customers
     WHERE phone = $1`,
    [phone.trim()]
  );
  return r.rows[0] || null;
};

// ── findById ──────────────────────────────────────────────────
const findById = async (id) => {
  const r = await db.query(
    `SELECT id, name, phone, alternate_identifier, alternate_approved_by, consent_given, consent_at, created_at
     FROM customers
     WHERE id = $1`,
    [id]
  );
  return r.rows[0] || null;
};

// ── upsertByPhone ─────────────────────────────────────────────
/**
 * Finds or creates a customer by phone number, updating their name and consent timestamp.
 * @param {object} param
 * @param {string} param.name
 * @param {string} param.phone
 * @param {boolean} param.consent_given
 * @param {object} [client] - optional transaction client
 * @returns {Promise<object>} customer record
 */
const upsertByPhone = async ({ name, phone, consent_given = true }, client = null) => {
  const execute = client ? (q, p) => client.query(q, p) : db.query;

  const r = await execute(
    `INSERT INTO customers (name, phone, consent_given, consent_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (phone) DO UPDATE
       SET name = EXCLUDED.name,
           consent_given = EXCLUDED.consent_given,
           consent_at = NOW(),
           updated_at = NOW()
     RETURNING id, name, phone, consent_given, consent_at, created_at`,
    [name.trim(), phone.trim(), consent_given]
  );
  return r.rows[0];
};

// ── createWithAlternate ───────────────────────────────────────
/**
 * For customers with no phone at all (requires owner approval).
 */
const createWithAlternate = async ({ name, alternate_identifier, approved_by }, client = null) => {
  const execute = client ? (q, p) => client.query(q, p) : db.query;

  const r = await execute(
    `INSERT INTO customers (name, alternate_identifier, alternate_approved_by, consent_given, consent_at)
     VALUES ($1, $2, $3, TRUE, NOW())
     RETURNING id, name, alternate_identifier, alternate_approved_by, created_at`,
    [name.trim(), alternate_identifier.trim(), approved_by]
  );
  return r.rows[0];
};

module.exports = {
  findByPhone,
  findById,
  upsertByPhone,
  createWithAlternate,
};
