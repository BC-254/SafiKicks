'use strict';
/**
 * errorHandler.js — Centralized Express error handler.
 * Must be registered LAST (after all routes) with 4 arguments.
 * Never leaks stack traces or internal details in production.
 */

const logger = require('../utils/logger');
const env    = require('../config/env');

/**
 * Known operational errors we can expose safely to the client.
 */
const SAFE_ERRORS = new Set([
  'ValidationError',
  'AuthorizationError',
  'NotFoundError',
  'ConflictError',
  'RateLimitError',
  'StateTransitionError',
]);

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Default to 500 Internal Server Error
  let status  = err.status || err.statusCode || 500;
  let message = 'An unexpected error occurred.';

  // Log everything with context
  logger.error('Request error', {
    method:  req.method,
    url:     req.originalUrl,
    status,
    name:    err.name,
    message: err.message,
    ...(env.IS_PROD ? {} : { stack: err.stack }),
  });

  // For known, safe error types — expose the message
  if (SAFE_ERRORS.has(err.name) || status < 500) {
    message = err.message;
  }

  // In development, include full error for easier debugging
  const body = {
    error: message,
    ...(env.IS_PROD ? {} : {
      debug: {
        name:    err.name,
        message: err.message,
        stack:   err.stack,
      },
    }),
  };

  res.status(status).json(body);
};

// ── Custom Error Factories ────────────────────────────────────

class ValidationError extends Error {
  constructor(message, fields = {}) {
    super(message);
    this.name   = 'ValidationError';
    this.status = 400;
    this.fields = fields;
  }
}

class AuthorizationError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name   = 'AuthorizationError';
    this.status = 403;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name   = 'NotFoundError';
    this.status = 404;
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name   = 'ConflictError';
    this.status = 409;
  }
}

class StateTransitionError extends Error {
  constructor(from, to) {
    super(`Invalid status transition: ${from} → ${to}`);
    this.name   = 'StateTransitionError';
    this.status = 422;
    this.from   = from;
    this.to     = to;
  }
}

module.exports = errorHandler;
module.exports.ValidationError     = ValidationError;
module.exports.AuthorizationError  = AuthorizationError;
module.exports.NotFoundError       = NotFoundError;
module.exports.ConflictError       = ConflictError;
module.exports.StateTransitionError = StateTransitionError;
