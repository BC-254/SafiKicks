'use strict';
/**
 * sms.service.js — SMS provider abstraction.
 *
 * SRS NFR-04: SMS is sent only for the defined events listed in spec.
 * SRS SEC-09: Provider credentials stored securely outside the code (.env).
 *
 * MODES (controlled by SMS_MODE env var):
 *   'mock' — logs the message to console (development / testing)
 *   'live' — sends via Africa's Talking API (production)
 *
 * To swap providers: add a new case in sendSMS() without touching callers.
 *
 * ALL SMS TEXT TEMPLATES live here so content is reviewed in one place.
 */

const env    = require('../config/env');
const logger = require('../utils/logger');

// ── Low-level send ────────────────────────────────────────────

/**
 * Send an SMS to a verified phone number.
 * @param {string} to      - E.164 phone number e.g. "+254712345678"
 * @param {string} message - Plain text body (keep under 160 chars for 1 part)
 * @returns {Promise<{ success: boolean, messageId?: string, error?: string }>}
 */
const sendSMS = async (to, message) => {
  if (env.SMS_MODE === 'mock') {
    logger.info('[SMS MOCK]', { to, message });
    return { success: true, messageId: `mock-${Date.now()}` };
  }

  if (env.SMS_PROVIDER === 'africastalking') {
    return sendViaAfricasTalking(to, message);
  }

  logger.warn('No SMS provider configured', { SMS_PROVIDER: env.SMS_PROVIDER });
  return { success: false, error: 'No SMS provider configured' };
};

// ── Africa's Talking implementation ──────────────────────────

const sendViaAfricasTalking = async (to, message) => {
  try {
    // Lazy-load: Africa's Talking SDK is optional in dev (mock mode)
    let AfricasTalking;
    try {
      AfricasTalking = require('africastalking');
    } catch {
      logger.error('africastalking package not installed. Run: npm install africastalking');
      return { success: false, error: 'SMS package not installed' };
    }

    const client = AfricasTalking({
      apiKey:   env.AT_API_KEY,
      username: env.AT_USERNAME,
    });

    const result = await client.SMS.send({
      to:      [to],
      message,
      from:    'SoleCare',  // sender ID — must be approved by AT
    });

    const recipient = result.SMSMessageData?.Recipients?.[0];
    if (recipient?.status === 'Success') {
      logger.info('SMS sent', { to, messageId: recipient.messageId });
      return { success: true, messageId: recipient.messageId };
    }

    logger.warn('SMS delivery failed', { to, result });
    return { success: false, error: recipient?.status || 'Unknown error' };

  } catch (err) {
    logger.error('SMS send error', { to, error: err.message });
    return { success: false, error: err.message };
  }
};

// ── Message templates ─────────────────────────────────────────
// All templates return plain strings under 160 chars where possible.
// {variables} are replaced by callers before passing to sendSMS().

const templates = {
  /**
   * Phone verification OTP (REG-03).
   * CRITICAL: This is the ONLY time a code appears in an SMS text.
   */
  phoneVerification: (code) =>
    `Your SoleCare verification code is: ${code}. Valid for ${env.OTP_EXPIRY_MINUTES} mins. Do NOT share this code.`,

  /**
   * Job registered confirmation (sent after job creation).
   */
  jobRegistered: (jobNumber, link) =>
    `SoleCare: Job ${jobNumber} registered. Track your repair: ${link}`,

  /**
   * Price proposed — customer must confirm via link.
   */
  priceProposed: (jobNumber, amount, link) =>
    `SoleCare: Your repair quote for job ${jobNumber} is KES ${amount}. Confirm or decline: ${link}`,

  /**
   * Price confirmation reminder (72h timeout).
   */
  priceReminder: (jobNumber, link) =>
    `SoleCare: Reminder — please confirm your repair price for job ${jobNumber}: ${link}`,

  /**
   * Revised price after On Hold.
   */
  revisedPrice: (jobNumber, reason, amount, link) =>
    `SoleCare: Update on job ${jobNumber}: ${reason}. New price: KES ${amount}. Confirm: ${link}`,

  /**
   * Job completed — shoes are ready.
   */
  jobCompleted: (jobNumber, balance) =>
    balance > 0
      ? `SoleCare: Your shoes are ready! Job ${jobNumber}. Balance due: KES ${balance}. Please pay at collection.`
      : `SoleCare: Your shoes are ready for collection! Job ${jobNumber}. No balance due.`,

  /**
   * Pickup code — CRITICAL: include do-not-share warning (SEC-05).
   * The code here is the PLAIN TEXT 6-digit code — sent only via SMS.
   */
  pickupCode: (code) =>
    `SoleCare: Your pickup code is ${code}. Show this to staff when collecting. Do NOT share this code.`,

  /**
   * Abandoned goods reminder.
   */
  abandonedReminder: (jobNumber, daysLeft) =>
    `SoleCare: Your shoes (job ${jobNumber}) are still with us. Please collect within ${daysLeft} days or they may be disposed of.`,

  /**
   * Owner/approver notification for out-of-band price.
   */
  approvalRequest: (jobNumber, amount, min, max, dashboardLink) =>
    `SoleCare: Approval needed — job ${jobNumber} price KES ${amount} (band KES ${min}-${max}). Review: ${dashboardLink}`,
};

// ── High-level send helpers ───────────────────────────────────
// These are called by route handlers — they build the message and send it.

const sendPhoneVerification = (phone, code) =>
  sendSMS(phone, templates.phoneVerification(code));

const sendJobRegistered = (phone, jobNumber, token) => {
  const link = `${env.APP_BASE_URL}/job/${token}`;
  return sendSMS(phone, templates.jobRegistered(jobNumber, link));
};

const sendPriceProposed = (phone, jobNumber, amount, token) => {
  const link = `${env.APP_BASE_URL}/job/${token}/confirm-price`;
  return sendSMS(phone, templates.priceProposed(jobNumber, amount, link));
};

const sendPriceReminder = (phone, jobNumber, token) => {
  const link = `${env.APP_BASE_URL}/job/${token}/confirm-price`;
  return sendSMS(phone, templates.priceReminder(jobNumber, link));
};

const sendRevisedPrice = (phone, jobNumber, reason, amount, token) => {
  const link = `${env.APP_BASE_URL}/job/${token}/confirm-price`;
  return sendSMS(phone, templates.revisedPrice(jobNumber, reason, amount, link));
};

const sendJobCompleted = (phone, jobNumber, balance) =>
  sendSMS(phone, templates.jobCompleted(jobNumber, balance));

const sendPickupCode = (phone, code) =>
  sendSMS(phone, templates.pickupCode(code));

const sendAbandonedReminder = (phone, jobNumber, daysLeft) =>
  sendSMS(phone, templates.abandonedReminder(jobNumber, daysLeft));

const sendApprovalRequest = (phone, jobNumber, amount, min, max) => {
  const link = `${env.APP_BASE_URL}/owner/approvals`;
  return sendSMS(phone, templates.approvalRequest(jobNumber, amount, min, max, link));
};

module.exports = {
  // Core
  sendSMS,
  templates,
  // High-level helpers (use these in route handlers)
  sendPhoneVerification,
  sendJobRegistered,
  sendPriceProposed,
  sendPriceReminder,
  sendRevisedPrice,
  sendJobCompleted,
  sendPickupCode,
  sendAbandonedReminder,
  sendApprovalRequest,
};
