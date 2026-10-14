'use strict';
/**
 * db.js — PostgreSQL connection pool.
 * Uses a single shared Pool instance for the entire app.
 * Tests the connection on startup and logs the result.
 */

const { Pool } = require('pg');
const env = require('./env');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Connection pool settings
  max: 20,              // maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: env.IS_PROD ? { rejectUnauthorized: false } : false,
});

// Test the connection on startup
pool.connect((err, client, release) => {
  if (err) {
    logger.error('Database connection failed', { error: err.message });
    process.exit(1);
  }
  client.query('SELECT NOW() as now, current_database() as db', (qErr, res) => {
    release();
    if (qErr) {
      logger.error('Database query failed', { error: qErr.message });
      process.exit(1);
    }
    logger.info('Database connected', {
      db: res.rows[0].db,
      time: res.rows[0].now,
    });
  });
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message });
});

/**
 * Execute a parameterised query.
 * @param {string} text - SQL query string with $1, $2, ... placeholders
 * @param {Array}  params - Parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a client from the pool for transaction use.
 * Always call client.release() in a finally block.
 * @returns {Promise<import('pg').PoolClient>}
 */
const getClient = () => pool.connect();

/**
 * Run multiple queries in a single transaction.
 * Automatically commits on success, rolls back on error.
 * @param {Function} fn - async (client) => { ... }
 */
const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { query, getClient, withTransaction, pool };
