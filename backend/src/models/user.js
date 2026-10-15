'use strict';
/**
 * user.js — Staff user model.
 * Handles all DB operations for the users table.
 * Customers are NOT users — they have no login.
 */

const db     = require('../config/db');
const bcrypt = require('bcrypt');
const env    = require('../config/env');

// ── findByEmail ───────────────────────────────────────────────
const findByEmail = async (email) => {
  const r = await db.query(
    `SELECT id, name, role, email, password_hash, active,
            failed_attempts, locked_until, created_at
     FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  return r.rows[0] || null;
};

// ── findById ──────────────────────────────────────────────────
const findById = async (id) => {
  const r = await db.query(
    `SELECT id, name, role, email, phone, active, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return r.rows[0] || null;
};

// ── listAll ───────────────────────────────────────────────────
const listAll = async () => {
  const r = await db.query(
    `SELECT id, name, role, email, phone, active, created_at
     FROM users
     ORDER BY role, name`
  );
  return r.rows;
};

// ── create ────────────────────────────────────────────────────
const create = async ({ name, role, email, phone = null, password }) => {
  const hash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const r = await db.query(
    `INSERT INTO users (name, role, email, phone, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, role, email, phone, active, created_at`,
    [name.trim(), role, email.toLowerCase().trim(), phone, hash]
  );
  return r.rows[0];
};

// ── update ────────────────────────────────────────────────────
const update = async (id, { name, role, phone, active }) => {
  const fields = [];
  const values = [];
  let p = 1;

  if (name  !== undefined) { fields.push(`name  = $${p++}`); values.push(name.trim()); }
  if (role  !== undefined) { fields.push(`role  = $${p++}`); values.push(role); }
  if (phone !== undefined) { fields.push(`phone = $${p++}`); values.push(phone); }
  if (active!== undefined) { fields.push(`active = $${p++}`); values.push(active); }

  if (fields.length === 0) return findById(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const r = await db.query(
    `UPDATE users SET ${fields.join(', ')}
     WHERE id = $${p}
     RETURNING id, name, role, email, phone, active, created_at`,
    values
  );
  return r.rows[0] || null;
};

// ── incrementFailedAttempts ───────────────────────────────────
const incrementFailedAttempts = async (id) => {
  const r = await db.query(
    `UPDATE users
     SET failed_attempts = failed_attempts + 1, updated_at = NOW()
     WHERE id = $1
     RETURNING failed_attempts`,
    [id]
  );
  return r.rows[0]?.failed_attempts || 0;
};

// ── lockUser ──────────────────────────────────────────────────
const lockUser = async (id, minutes = env.LOGIN_LOCKOUT_MINUTES) => {
  await db.query(
    `UPDATE users
     SET locked_until = NOW() + ($1 || ' minutes')::INTERVAL,
         updated_at   = NOW()
     WHERE id = $2`,
    [minutes, id]
  );
};

// ── resetFailedAttempts ───────────────────────────────────────
const resetFailedAttempts = async (id) => {
  await db.query(
    `UPDATE users
     SET failed_attempts = 0, locked_until = NULL, updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
};

// ── isLocked ──────────────────────────────────────────────────
const isLocked = (user) => {
  if (!user.locked_until) return false;
  return new Date(user.locked_until) > new Date();
};

// ── verifyPassword ────────────────────────────────────────────
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

module.exports = {
  findByEmail,
  findById,
  listAll,
  create,
  update,
  incrementFailedAttempts,
  lockUser,
  resetFailedAttempts,
  isLocked,
  verifyPassword,
};
