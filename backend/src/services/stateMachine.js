'use strict';
/**
 * stateMachine.js — Job lifecycle state machine.
 *
 * SRS SEC-03: Status transitions are enforced by a backend state machine.
 * SRS 3.4:    Statuses cannot be skipped; invalid changes are rejected
 *             regardless of what the user interface allows.
 *
 * Usage:
 *   const { assertTransition } = require('../services/stateMachine');
 *   assertTransition(job.status, 'In Queue', 'counter_staff'); // throws if invalid
 */

const { VALID_TRANSITIONS, JOB_STATUS } = require('../config/constants');
const { StateTransitionError }           = require('../middleware/errorHandler');

// ── isValidTransition ─────────────────────────────────────────
/**
 * Check whether a status transition is allowed for the given actor role.
 *
 * @param {string} fromStatus  - current job status (JOB_STATUS value)
 * @param {string} toStatus    - desired next status
 * @param {string} actorRole   - 'counter_staff'|'repairer'|'owner'|'customer'|'system'
 * @returns {boolean}
 */
const isValidTransition = (fromStatus, toStatus, actorRole) => {
  const allowedTargets = VALID_TRANSITIONS[fromStatus];
  if (!allowedTargets) return false;

  const match = allowedTargets.find((t) => t.to === toStatus);
  if (!match) return false;

  return match.allowedRoles.includes(actorRole);
};

// ── assertTransition ──────────────────────────────────────────
/**
 * Like isValidTransition but throws a StateTransitionError on failure.
 * Use this in route handlers so invalid attempts always return 422.
 *
 * @param {string} fromStatus
 * @param {string} toStatus
 * @param {string} actorRole
 * @throws {StateTransitionError}
 */
const assertTransition = (fromStatus, toStatus, actorRole) => {
  if (!isValidTransition(fromStatus, toStatus, actorRole)) {
    throw new StateTransitionError(fromStatus, toStatus);
  }
};

// ── getReachableStatuses ──────────────────────────────────────
/**
 * Return all statuses this actor can transition to from the current state.
 * Useful for building conditional UI button lists from the API.
 *
 * @param {string} fromStatus
 * @param {string} actorRole
 * @returns {string[]}
 */
const getReachableStatuses = (fromStatus, actorRole) => {
  const targets = VALID_TRANSITIONS[fromStatus] || [];
  return targets
    .filter((t) => t.allowedRoles.includes(actorRole))
    .map((t) => t.to);
};

// ── isTerminalStatus ──────────────────────────────────────────
/**
 * Returns true if a job in this status can never transition further
 * without an owner override.
 * @param {string} status
 * @returns {boolean}
 */
const isTerminalStatus = (status) =>
  [JOB_STATUS.CLOSED, JOB_STATUS.PICKED].includes(status);

// ── isFinalStatus ─────────────────────────────────────────────
/**
 * Returns true for statuses where no further work is expected.
 */
const isFinalStatus = (status) =>
  [
    JOB_STATUS.PICKED,
    JOB_STATUS.EXPIRED,
    JOB_STATUS.CANCELLED,
    JOB_STATUS.ABANDONED,
    JOB_STATUS.CLOSED,
  ].includes(status);

// ── isWorkableStatus ─────────────────────────────────────────
/**
 * Returns true if a repairer can actively work on the job.
 */
const isWorkableStatus = (status) =>
  [JOB_STATUS.STARTED, JOB_STATUS.ON_HOLD].includes(status);

module.exports = {
  isValidTransition,
  assertTransition,
  getReachableStatuses,
  isTerminalStatus,
  isFinalStatus,
  isWorkableStatus,
  TRANSITIONS: VALID_TRANSITIONS, // export raw map for reference
};
