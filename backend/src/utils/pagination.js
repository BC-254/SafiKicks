'use strict';
/**
 * pagination.js — Reusable pagination helpers.
 *
 * Usage in a route:
 *   const { parsePagination, paginatedResponse } = require('../utils/pagination');
 *   const { page, limit, offset } = parsePagination(req.query);
 *   const { rows, total } = await Model.list({ offset, limit, ...filters });
 *   res.json(paginatedResponse(rows, total, page, limit));
 */

const DEFAULT_LIMIT = 50;
const MAX_LIMIT     = 200;

/**
 * Parse and clamp page/limit from query string.
 * @param {object} query - req.query
 * @returns {{ page: number, limit: number, offset: number }}
 */
const parsePagination = (query = {}) => {
  const page  = Math.max(1, parseInt(query.page  || '1',  10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(query.limit || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Build a consistent paginated JSON response envelope.
 * @param {Array}  rows
 * @param {number} total  - total row count (from COUNT query)
 * @param {number} page
 * @param {number} limit
 * @returns {object}
 */
const paginatedResponse = (rows, total, page, limit) => ({
  data:       rows,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext:    page * limit < total,
    hasPrev:    page > 1,
  },
});

module.exports = { parsePagination, paginatedResponse, DEFAULT_LIMIT, MAX_LIMIT };
