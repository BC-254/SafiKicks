'use strict';

// ============================================================
// constants.js — Central source of truth for all enums,
// business rules, and configuration values used throughout
// the backend. Import from here; never hardcode strings.
// ============================================================

// ── Job Status ───────────────────────────────────────────────
const JOB_STATUS = Object.freeze({
  REGISTERED:           'Registered',
  IN_QUEUE:             'In Queue',
  AWAITING_CONFIRMATION:'Awaiting Confirmation',
  STARTED:              'Started',
  ON_HOLD:              'On Hold',
  COMPLETED:            'Completed',
  PICKED:               'Picked',
  EXPIRED:              'Expired',
  CANCELLED:            'Cancelled',
  ABANDONED:            'Abandoned',
  CLOSED:               'Closed',
});

// ── Payment Status ───────────────────────────────────────────
const PAYMENT_STATUS = Object.freeze({
  UNPAID:    'Unpaid',
  PART_PAID: 'Part-paid',
  PAID:      'Paid',
});

// ── User Roles ───────────────────────────────────────────────
const ROLES = Object.freeze({
  COUNTER_STAFF: 'counter_staff',
  REPAIRER:      'repairer',
  OWNER:         'owner',
});

// ── Photo Types ──────────────────────────────────────────────
const PHOTO_TYPE = Object.freeze({
  RECEIPT:    'receipt',
  COMPLETION: 'completion',
});

// ── Payment Types ────────────────────────────────────────────
const PAYMENT_TYPE = Object.freeze({
  PAYMENT:  'payment',
  REVERSAL: 'reversal',
});

// ── Payment Methods ──────────────────────────────────────────
const PAYMENT_METHOD = Object.freeze({
  CASH:  'cash',
  MPESA: 'mpesa',
  CARD:  'card',
});

// ── Approval Types ───────────────────────────────────────────
const APPROVAL_TYPE = Object.freeze({
  OUT_OF_BAND_PRICE:    'out_of_band_price',
  PICKUP_OVERRIDE:      'pickup_override',
  ALTERNATE_IDENTIFIER: 'alternate_identifier',
  STATUS_REVERSAL:      'status_reversal',
});

// ── Approval Decisions ───────────────────────────────────────
const APPROVAL_DECISION = Object.freeze({
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

// ── Registration Channel ─────────────────────────────────────
const CHANNEL = Object.freeze({
  SELF_REGISTERED:  'self_registered',
  STAFF_REGISTERED: 'staff_registered',
});

// ── Job Lifecycle: Valid State Transitions ───────────────────
// Format: { from: [{ to, allowedRoles }] }
// Roles: 'counter_staff' | 'repairer' | 'owner' | 'customer' | 'system'
const VALID_TRANSITIONS = Object.freeze({
  [JOB_STATUS.REGISTERED]: [
    { to: JOB_STATUS.IN_QUEUE,  allowedRoles: [ROLES.COUNTER_STAFF, ROLES.OWNER] },
    { to: JOB_STATUS.EXPIRED,   allowedRoles: ['system'] },
  ],
  [JOB_STATUS.IN_QUEUE]: [
    { to: JOB_STATUS.AWAITING_CONFIRMATION, allowedRoles: [ROLES.REPAIRER] },
  ],
  [JOB_STATUS.AWAITING_CONFIRMATION]: [
    { to: JOB_STATUS.STARTED,   allowedRoles: ['customer'] },
    { to: JOB_STATUS.CANCELLED, allowedRoles: ['customer', ROLES.OWNER] },
  ],
  [JOB_STATUS.STARTED]: [
    { to: JOB_STATUS.COMPLETED, allowedRoles: [ROLES.REPAIRER, ROLES.OWNER] },
    { to: JOB_STATUS.ON_HOLD,   allowedRoles: [ROLES.REPAIRER, ROLES.OWNER] },
  ],
  [JOB_STATUS.ON_HOLD]: [
    { to: JOB_STATUS.STARTED,   allowedRoles: ['customer', ROLES.OWNER] },
    { to: JOB_STATUS.CANCELLED, allowedRoles: ['customer', ROLES.OWNER] },
  ],
  [JOB_STATUS.COMPLETED]: [
    { to: JOB_STATUS.PICKED,    allowedRoles: [ROLES.REPAIRER, ROLES.COUNTER_STAFF, ROLES.OWNER] },
    { to: JOB_STATUS.ABANDONED, allowedRoles: ['system', ROLES.OWNER] },
  ],
  [JOB_STATUS.PICKED]: [
    { to: JOB_STATUS.CLOSED, allowedRoles: ['system'] },
  ],
  [JOB_STATUS.EXPIRED]: [
    { to: JOB_STATUS.CLOSED, allowedRoles: ['system'] },
  ],
  [JOB_STATUS.CANCELLED]: [
    { to: JOB_STATUS.CLOSED, allowedRoles: ['system'] },
  ],
  [JOB_STATUS.ABANDONED]: [
    { to: JOB_STATUS.PICKED,  allowedRoles: [ROLES.OWNER] },
    { to: JOB_STATUS.CLOSED,  allowedRoles: ['system', ROLES.OWNER] },
  ],
});

// ── Service Catalog: Price Bands ─────────────────────────────
// min_price and max_price in KES. fixed=true means max_price === min_price.
const SERVICE_CATALOG_SEED = Object.freeze([
  { name: 'Basic Cleaning',    min_price: 200, max_price: 500,  standard_turnaround_hours: 24 },
  { name: 'Deep Cleaning',     min_price: 250, max_price: 500,  standard_turnaround_hours: 48 },
  { name: 'Shoe Whitening',    min_price: 500, max_price: 500,  standard_turnaround_hours: 24 },
  { name: 'Suede Cleaning',    min_price: 300, max_price: 300,  standard_turnaround_hours: 48 },
  { name: 'Shoe Repair',       min_price: 500, max_price: 500,  standard_turnaround_hours: 72 },
  { name: 'Shoe Restoration',  min_price: 700, max_price: 700,  standard_turnaround_hours: 96 },
  { name: 'Deodorization',     min_price: 300, max_price: 300,  standard_turnaround_hours: 24 },
  { name: 'Stain Removal',     min_price: 300, max_price: 300,  standard_turnaround_hours: 24 },
  { name: 'Other',             min_price: 0,   max_price: null, standard_turnaround_hours: null },
]);

// ── SMS Event Types (for logging + triggers) ─────────────────
const SMS_EVENT = Object.freeze({
  PHONE_VERIFICATION:  'phone_verification',
  JOB_REGISTERED:      'job_registered',
  PRICE_PROPOSED:      'price_proposed',
  PRICE_REMINDER:      'price_reminder',
  REVISED_PRICE:       'revised_price',
  JOB_COMPLETED:       'job_completed',
  PICKUP_CODE:         'pickup_code',
  ABANDONED_REMINDER:  'abandoned_reminder',
  APPROVAL_REQUEST:    'approval_request',
});

// ── Audit Event Types ────────────────────────────────────────
const AUDIT_EVENT = Object.freeze({
  JOB_CREATED:         'job_created',
  STATUS_CHANGED:      'status_changed',
  PRICE_PROPOSED:      'price_proposed',
  PRICE_CONFIRMED:     'price_confirmed',
  PRICE_DECLINED:      'price_declined',
  PAYMENT_RECORDED:    'payment_recorded',
  PAYMENT_REVERSED:    'payment_reversed',
  PHOTO_UPLOADED:      'photo_uploaded',
  PICKUP_CODE_SENT:    'pickup_code_sent',
  PICKUP_CODE_FAILED:  'pickup_code_failed',
  PICKUP_CODE_LOCKED:  'pickup_code_locked',
  JOB_PICKED:          'job_picked',
  OVERRIDE_APPLIED:    'override_applied',
  APPROVAL_REQUESTED:  'approval_requested',
  APPROVAL_DECIDED:    'approval_decided',
  JOB_CLAIMED:         'job_claimed',
  STAFF_REGISTERED:    'staff_registered_job',
});

// ── Business Rule Defaults (env overrides these) ─────────────
const DEFAULTS = Object.freeze({
  REGISTRATION_EXPIRY_HOURS:         48,
  PRICE_CONFIRMATION_TIMEOUT_HOURS:  72,
  ABANDONED_DAYS:                    30,
  OTP_MAX_ATTEMPTS:                  3,
  LOGIN_MAX_ATTEMPTS:                5,
  LOGIN_LOCKOUT_MINUTES:             5,
  OTP_EXPIRY_MINUTES:                10,
  PICKUP_CODE_EXPIRY_HOURS:          24,
  SESSION_INACTIVITY_MINUTES:        5,
  BCRYPT_ROUNDS:                     12,
  RECEIPT_PHOTO_MIN:                 2,
  RECEIPT_PHOTO_MAX:                 5,
  PHOTO_RETENTION_DAYS:              30,
});

module.exports = {
  JOB_STATUS,
  PAYMENT_STATUS,
  ROLES,
  PHOTO_TYPE,
  PAYMENT_TYPE,
  PAYMENT_METHOD,
  APPROVAL_TYPE,
  APPROVAL_DECISION,
  CHANNEL,
  VALID_TRANSITIONS,
  SERVICE_CATALOG_SEED,
  SMS_EVENT,
  AUDIT_EVENT,
  DEFAULTS,
};
