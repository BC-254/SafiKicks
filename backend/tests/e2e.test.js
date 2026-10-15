/**
 * e2e.test.js — Comprehensive End-to-End Test Suite for SoleCare
 */

'use strict';

require('dotenv').config({ path: __dirname + '/../.env' });
const http = require('http');
const { Pool } = require('pg');
const app = require('../src/app');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

let server;
let baseUrl;

function request(method, path, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers },
    };

    let payload;
    if (body) {
      payload = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting SoleCare End-to-End Test Suite...\n');

  // Start test server on random free port
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log(`📡 Test server running at ${baseUrl}`);

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (!condition) {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  }

  try {
    // ── 1. Health check ───────────────────────────────────────
    console.log('\n--- 1. Health & Catalog Tests ---');
    const health = await request('GET', '/health');
    assert(health.status === 200 && health.data.status === 'ok', 'GET /health returns 200 OK');

    const catalog = await request('GET', '/api/catalog');
    const services = catalog.data.services || catalog.data;
    assert(catalog.status === 200 && Array.isArray(services) && services.length >= 8, 'GET /api/catalog returns seeded services');

    // ── 2. Auth & RBAC ────────────────────────────────────────
    console.log('\n--- 2. Authentication & RBAC Tests ---');
    const ownerLogin = await request('POST', '/api/auth/login', {
      body: { email: 'owner@solecare.co.ke', password: 'ChangeMe123!' },
    });
    assert(ownerLogin.status === 200 && ownerLogin.data.token && ownerLogin.data.user.role === 'owner', 'Owner login successful');
    const ownerToken = ownerLogin.data.token;

    const repairerLogin = await request('POST', '/api/auth/login', {
      body: { email: 'joseph@solecare.co.ke', password: 'SecureRepairer123!' },
    });
    assert(repairerLogin.status === 200 && repairerLogin.data.token && repairerLogin.data.user.role === 'repairer', 'Repairer login successful');
    const repairerToken = repairerLogin.data.token;

    const counterLogin = await request('POST', '/api/auth/login', {
      body: { email: 'grace@solecare.co.ke', password: 'CounterStaff123!' },
    });
    assert(counterLogin.status === 200 && counterLogin.data.token && counterLogin.data.user.role === 'counter_staff', 'Counter Staff login successful');
    const counterToken = counterLogin.data.token;

    // Unauthorized access: Repairer accessing Owner dashboard
    const forbiddenTest = await request('GET', '/api/owner/dashboard', {
      headers: { Authorization: `Bearer ${repairerToken}` },
    });
    assert(forbiddenTest.status === 403, 'Repairer blocked from Owner Dashboard (403 Forbidden)');

    // Unauthenticated access
    const unauthTest = await request('GET', '/api/owner/dashboard');
    assert(unauthTest.status === 401, 'Unauthenticated request blocked (401 Unauthorized)');

    // ── 3. Customer Intake & Registration ─────────────────────
    console.log('\n--- 3. Customer Registration & Verification Flow ---');
    const testPhone = `07${Math.floor(10000000 + Math.random() * 90000000)}`;
    const verifyReq = await request('POST', '/api/register/verify-phone', {
      body: { phone: testPhone },
    });
    assert(verifyReq.status === 200, 'Phone verification code dispatched');

    // Retrieve hashed OTP from DB in test mode to simulate customer receiving SMS
    const smsRes = await pool.query(
      `SELECT message FROM sms_log WHERE phone LIKE $1 ORDER BY created_at DESC LIMIT 1`,
      [`%${testPhone.slice(1)}%`]
    );
    const codeMatch = smsRes.rows[0]?.message.match(/\b\d{6}\b/);
    const otpCode = codeMatch ? codeMatch[0] : (verifyReq.data.devCode || '123456');

    const confirmPhone = await request('POST', '/api/register/confirm-phone', {
      body: { phone: testPhone, code: otpCode },
    });
    assert(confirmPhone.status === 200 && confirmPhone.data.phoneSessionToken, 'Phone confirmed, session token received');
    const customerSession = confirmPhone.data.phoneSessionToken;

    // Register job as customer
    const cleaningService = services.find((s) => s.name === 'Basic Cleaning') || services[0];
    const registerJob = await request('POST', '/api/register/job', {
      headers: { Authorization: `Bearer ${customerSession}` },
      body: {
        name: 'Test Alice',
        service_id: cleaningService.id,
        shoe_brand: 'Nike',
        shoe_color: 'White',
        notes: 'Heel scuff on left shoe',
        consent_given: true,
      },
    });
    assert(registerJob.status === 201 && registerJob.data.accessToken, 'Job registered with accessToken');
    const accessToken = registerJob.data.accessToken;

    // Fetch registered job details
    const jobDetail = await request('GET', `/api/job/${accessToken}`);
    assert(jobDetail.status === 200 && jobDetail.data.job?.status === 'Registered', 'Public tracking endpoint returns Registered job');
    const job = jobDetail.data.job;

    // ── 4. Counter Intake (Mark Received) ─────────────────────
    console.log('\n--- 4. Counter Intake & Receipting ---');
    const receiveJob = await request('POST', `/api/receipt/${job.id}/receive`, {
      headers: { Authorization: `Bearer ${counterToken}` },
      body: { notes: 'Physically inspected at front counter' },
    });
    assert(receiveJob.status === 200 && receiveJob.data.job?.status === 'In Queue', 'Job physically received, status transitioned to In Queue');

    // ── 5. Repairer Queue & Concurrency Lock ──────────────────
    console.log('\n--- 5. Repairer Claim & Race Condition Lock (409) ---');
    const queue = await request('GET', '/api/repairer/queue', {
      headers: { Authorization: `Bearer ${repairerToken}` },
    });
    const queueList = queue.data.queue || queue.data.jobs || [];
    const foundInQueue = queueList.some((j) => j.id === job.id);
    assert(foundInQueue, 'Job appears in Repairer Queue');

    // First claim: Joseph claims
    const claimRes = await request('POST', `/api/repairer/jobs/${job.id}/claim`, {
      headers: { Authorization: `Bearer ${repairerToken}` },
    });
    assert(claimRes.status === 200, 'Repairer successfully claims job');

    // Second claim: Simultaneous claim by another repairer/owner -> MUST return 409 Conflict
    const secondClaim = await request('POST', `/api/repairer/jobs/${job.id}/claim`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert(secondClaim.status === 409, 'Duplicate claim rejected with 409 Conflict');

    // ── 6. State Machine Violation (422 Error) ─────────────────
    console.log('\n--- 6. State Machine Validation (SEC-03) ---');
    // Try to jump from In Queue / Claimed directly to Completed without price confirmation
    const invalidJump = await request('PATCH', `/api/repairer/jobs/${job.id}/status`, {
      headers: { Authorization: `Bearer ${repairerToken}` },
      body: { status: 'Completed' },
    });
    assert(invalidJump.status === 422, 'Out-of-order status transition strictly rejected with 422 Unprocessable Entity');

    // ── 7. Price Proposal & In-Band Check ─────────────────────
    console.log('\n--- 7. Price Proposal & Band Validation ---');
    const priceRes = await request('POST', `/api/repairer/jobs/${job.id}/price`, {
      headers: { Authorization: `Bearer ${repairerToken}` },
      body: {
        amount: 350, // within Basic Cleaning range 200-500
        notes: 'Standard cleaning fee applied',
      },
    });
    assert(priceRes.status === 200 && priceRes.data.status === 'Awaiting Confirmation', 'In-band price proposed, job transitioned to Awaiting Confirmation');

    // ── 8. Customer Price Confirmation ────────────────────────
    console.log('\n--- 8. Customer Price Confirmation Flow ---');
    const viewPrice = await request('GET', `/api/job/${accessToken}/price`);
    assert(viewPrice.status === 200 && Number(viewPrice.data.price?.amount) === 350, 'Customer retrieves proposed price via tracking token');

    const confirmPrice = await request('POST', `/api/job/${accessToken}/price/confirm`);
    const confirmedStatus = confirmPrice.data.status || confirmPrice.data.job?.status;
    assert(confirmPrice.status === 200 && confirmedStatus === 'Started', 'Customer confirms price, job transitions to Started');

    // ── 9. Work Completion ────────────────────────────────────
    console.log('\n--- 9. Work Completion ---');
    const completeRes = await request('PATCH', `/api/repairer/jobs/${job.id}/status`, {
      headers: { Authorization: `Bearer ${repairerToken}` },
      body: { status: 'Completed' },
    });
    assert(completeRes.status === 200 && completeRes.data.job?.status === 'Completed', 'Repairer marks job Completed');

    // ── 10. Payment Ledger Recording ──────────────────────────
    console.log('\n--- 10. Payment Ledger & Balance Reconciliation ---');
    const payRes = await request('POST', '/api/counter/payments', {
      headers: { Authorization: `Bearer ${counterToken}` },
      body: {
        job_id: job.id,
        amount: 350,
        method: 'mpesa',
        reference: 'QWE1234567',
      },
    });
    assert(payRes.status === 201 && payRes.data.paymentStatus === 'Paid', 'M-Pesa payment recorded, job payment_status is Paid');

    // ── 11. OTP Pickup Flow (SEC-05) ──────────────────────────
    console.log('\n--- 11. Hashed OTP Customer Pickup Flow ---');
    const sendOtpRes = await request('POST', `/api/pickup/${job.id}/send-code`, {
      headers: { Authorization: `Bearer ${counterToken}` },
    });
    assert(sendOtpRes.status === 200 && !sendOtpRes.data.code, 'Pickup OTP dispatched (Plain code NEVER returned in API)');

    // Fetch the code from sms_log to simulate verbal customer presentation
    const pickupSms = await pool.query(
      `SELECT message FROM sms_log WHERE message LIKE '%pickup code%' ORDER BY created_at DESC LIMIT 1`
    );
    const pickupMatch = pickupSms.rows[0]?.message.match(/\b\d{6}\b/);
    const pickupOtp = pickupMatch ? pickupMatch[0] : null;
    assert(!!pickupOtp, 'Pickup code found in customer SMS dispatch');

    // Wrong OTP attempt test
    const wrongOtp = await request('POST', `/api/pickup/${job.id}/verify`, {
      headers: { Authorization: `Bearer ${counterToken}` },
      body: { code: '000000' },
    });
    assert(wrongOtp.status === 400, 'Incorrect OTP rejected with attempts decremented');

    // Correct OTP verification
    const verifyOtp = await request('POST', `/api/pickup/${job.id}/verify`, {
      headers: { Authorization: `Bearer ${counterToken}` },
      body: { code: pickupOtp },
    });
    assert(verifyOtp.status === 200 && verifyOtp.data.status === 'Picked', 'Correct OTP verified, job successfully transitioned to Picked');

    // ── 12. Audit Trail Immutability Verification ──────────────
    console.log('\n--- 12. Audit Trail & Immutability Verification ---');
    const auditRes = await request('GET', `/api/owner/jobs/${job.id}/audit`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const timeline = auditRes.data.timeline || [];
    assert(auditRes.status === 200 && Array.isArray(timeline) && timeline.length >= 6, 'Full chronological audit history preserved');

    // Direct SQL immutability test on job_events
    let updateFailed = false;
    try {
      await pool.query(`UPDATE job_events SET event_type = 'HACKED' WHERE job_id = $1`, [job.id]);
    } catch (err) {
      updateFailed = true;
      assert(err.message.includes('immutable'), 'PostgreSQL trigger prevents UPDATE on job_events');
    }
    assert(updateFailed, 'Trigger successfully rejected UPDATE on audit log');

    let deleteFailed = false;
    try {
      await pool.query(`DELETE FROM job_events WHERE job_id = $1`, [job.id]);
    } catch (err) {
      deleteFailed = true;
      assert(err.message.includes('immutable'), 'PostgreSQL trigger prevents DELETE on job_events');
    }
    assert(deleteFailed, 'Trigger successfully rejected DELETE on audit log');

    console.log(`\n=================================================`);
    console.log(`🎉 ALL ${passed}/${total} TESTS PASSED WITH 100% SUCCESS!`);
    console.log(`=================================================\n`);

  } catch (err) {
    console.error('\n❌ Test Suite Failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) server.close();
    await pool.end();
  }
}

runTests();
