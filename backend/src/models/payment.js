'use strict';
/**
 * payment.js — Data access model for payments and payment status calculation.
 *
 * Rules (from SRS 5.1 & SEC-01):
 *  - Payments are strictly append-only.
 *  - Corrections/refunds are recorded as new rows with type = 'reversal'.
 *  - payment_status is calculated as:
 *      net_paid = sum(payments) - sum(reversals)
 *      if net_paid <= 0                -> 'Unpaid'
 *      if 0 < net_paid < agreed_price  -> 'Part-paid'
 *      if net_paid >= agreed_price     -> 'Paid'
 */

const db = require('../config/db');
const { PAYMENT_STATUS, PAYMENT_TYPE } = require('../config/constants');

class Payment {
  /**
   * Recalculate net paid and synchronize job payment_status.
   */
  static async syncJobPaymentStatus(jobId, client = null) {
    const q = client ? client.query.bind(client) : db.query.bind(db);

    const [priceRes, paidRes] = await Promise.all([
      q(
        `SELECT amount FROM price_versions WHERE job_id = $1 ORDER BY version_number DESC LIMIT 1`,
        [jobId]
      ),
      q(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'payment' THEN amount ELSE -amount END), 0) AS net_paid
         FROM payments
         WHERE job_id = $1`,
        [jobId]
      ),
    ]);

    const agreedPrice = priceRes.rows[0]?.amount ? parseFloat(priceRes.rows[0].amount) : 0;
    const netPaid = parseFloat(paidRes.rows[0]?.net_paid || 0);

    let newStatus = PAYMENT_STATUS.UNPAID;
    if (agreedPrice > 0) {
      if (netPaid >= agreedPrice) {
        newStatus = PAYMENT_STATUS.PAID;
      } else if (netPaid > 0) {
        newStatus = PAYMENT_STATUS.PART_PAID;
      }
    } else {
      if (netPaid > 0) {
        newStatus = PAYMENT_STATUS.PAID;
      }
    }

    await q(
      `UPDATE jobs
       SET payment_status = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [newStatus, jobId]
    );

    const balanceDue = Math.max(0, agreedPrice - netPaid);

    return {
      agreedPrice,
      netPaid,
      balanceDue,
      paymentStatus: newStatus,
    };
  }

  /**
   * Record a payment (cash, mpesa, card).
   */
  static async recordPayment(
    { jobId, amount, method, reference = null, receivedBy, notes = null, verified = true },
    client = null
  ) {
    const q = client ? client.query.bind(client) : db.query.bind(db);

    const pRes = await q(
      `INSERT INTO payments (job_id, amount, method, reference, verified, received_by, type, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [jobId, amount, method, reference, verified, receivedBy, PAYMENT_TYPE.PAYMENT, notes]
    );

    const payment = pRes.rows[0];
    const summary = await Payment.syncJobPaymentStatus(jobId, client);

    return { payment, ...summary };
  }

  /**
   * Record a payment reversal (owner only).
   */
  static async recordReversal({ jobId, amount, receivedBy, reason }, client = null) {
    const q = client ? client.query.bind(client) : db.query.bind(db);

    const pRes = await q(
      `INSERT INTO payments (job_id, amount, method, reference, verified, received_by, type, notes)
       VALUES ($1, $2, 'reversal', NULL, true, $3, $4, $5)
       RETURNING *`,
      [jobId, amount, receivedBy, PAYMENT_TYPE.REVERSAL, reason]
    );

    const reversal = pRes.rows[0];
    const summary = await Payment.syncJobPaymentStatus(jobId, client);

    return { reversal, ...summary };
  }

  /**
   * Get full payment ledger for a job.
   */
  static async getLedgerForJob(jobId, client = null) {
    const q = client ? client.query.bind(client) : db.query.bind(db);

    const res = await q(
      `SELECT
         p.*,
         u.name AS received_by_name,
         u.role AS received_by_role
       FROM payments p
       JOIN users u ON p.received_by = u.id
       WHERE p.job_id = $1
       ORDER BY p.created_at ASC`,
      [jobId]
    );

    return res.rows;
  }

  /**
   * Fetch complete financial summary for a job.
   */
  static async getSummary(jobId, client = null) {
    const q = client ? client.query.bind(client) : db.query.bind(db);

    const [ledger, priceRes, jobRes] = await Promise.all([
      Payment.getLedgerForJob(jobId, client),
      q(
        `SELECT amount, version_number FROM price_versions WHERE job_id = $1 ORDER BY version_number DESC LIMIT 1`,
        [jobId]
      ),
      q(
        `SELECT payment_status FROM jobs WHERE id = $1`,
        [jobId]
      ),
    ]);

    const agreedPrice = priceRes.rows[0]?.amount ? parseFloat(priceRes.rows[0].amount) : 0;
    const netPaid = ledger.reduce((acc, row) => {
      const amt = parseFloat(row.amount);
      return row.type === PAYMENT_TYPE.PAYMENT ? acc + amt : acc - amt;
    }, 0);

    const balanceDue = Math.max(0, agreedPrice - netPaid);

    return {
      agreedPrice,
      totalPaid: netPaid,
      balanceDue,
      paymentStatus: jobRes.rows[0]?.payment_status || PAYMENT_STATUS.UNPAID,
      ledger,
    };
  }
}

module.exports = Payment;
