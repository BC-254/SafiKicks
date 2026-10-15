'use strict';
/**
 * photo.js — Photo database model.
 * Handles receipt photos (intake condition) and completion photos (post-repair).
 */

const db = require('../config/db');
const { PHOTO_TYPE } = require('../config/constants');

// ── addPhoto ──────────────────────────────────────────────────
const addPhoto = async ({ job_id, type = PHOTO_TYPE.RECEIPT, file_url, taken_by }, client = null) => {
  const execute = client ? (q, p) => client.query(q, p) : db.query;

  const r = await execute(
    `INSERT INTO photos (job_id, type, file_url, taken_by)
     VALUES ($1, $2, $3, $4)
     RETURNING id, job_id, type, file_url, taken_by, created_at`,
    [job_id, type, file_url, taken_by]
  );
  return r.rows[0];
};

// ── getPhotosForJob ───────────────────────────────────────────
const getPhotosForJob = async (job_id) => {
  const r = await db.query(
    `SELECT p.id, p.job_id, p.type, p.file_url, p.created_at, u.name as taken_by_name
     FROM photos p
     LEFT JOIN users u ON p.taken_by = u.id
     WHERE p.job_id = $1
     ORDER BY p.created_at ASC`,
    [job_id]
  );
  return r.rows;
};

module.exports = {
  addPhoto,
  getPhotosForJob,
};
