'use strict';
/**
 * logger.js — Structured console logger with timestamps.
 * Output format: [LEVEL] YYYY-MM-DD HH:mm:ss | message { meta }
 */

const env = require('../config/env');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT_LEVEL = env.IS_PROD ? 1 : 3; // warn+ in prod, debug+ in dev

const colors = {
  error: '\x1b[31m', // red
  warn:  '\x1b[33m', // yellow
  info:  '\x1b[36m', // cyan
  debug: '\x1b[90m', // gray
  reset: '\x1b[0m',
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

function log(level, message, meta = {}) {
  if (LEVELS[level] > CURRENT_LEVEL) return;

  const color = env.IS_PROD ? '' : colors[level];
  const reset = env.IS_PROD ? '' : colors.reset;
  const metaStr = Object.keys(meta).length
    ? ' ' + JSON.stringify(meta)
    : '';

  const line = `${color}[${level.toUpperCase()}]${reset} ${timestamp()} | ${message}${metaStr}`;

  if (level === 'error') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

const logger = {
  error: (msg, meta) => log('error', msg, meta),
  warn:  (msg, meta) => log('warn',  msg, meta),
  info:  (msg, meta) => log('info',  msg, meta),
  debug: (msg, meta) => log('debug', msg, meta),
};

module.exports = logger;
