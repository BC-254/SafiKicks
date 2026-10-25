# Safi Kicks — Shoe Repair Job Tracking & Revenue Control System

A high-reliability, security-hardened web platform designed for premium shoe repair and restoration enterprises. It coordinates customer intake, repair tracking, pricing approvals, M-Pesa/cash payment ledgers, and secure OTP-verified customer pickups.

---

## 🎨 Apple-Inspired Design Philosophy

Safi Kicks is purposefully styled with a native, calm, and restrained aesthetic that mirrors Apple's design language:
- **Surfaces & Palettes**: Pure off-white backgrounds (`#F5F5F7`, `#FFFFFF`), deep slate primary typography (`#1D1D1F`), and a single restrained CTA accent (`#0071E3`).
- **Components**: Pill-shaped action buttons (`border-radius: 980px`), flat cards with subtle elevation (`border-radius: 18px`, `box-shadow: 0 2px 12px rgba(0,0,0,0.07)`), and desaturated status badges.
- **Micro-Interactions**: Subtle, organic presses (`scale(0.98)`).
- **Strict Avoidance**: **Zero** multi-color gradients, **zero** neon glows, **zero** dark glassmorphism, and **zero** noisy AI animations.

---

## 📱 Three-Dashboard Ecosystem

1. **Customer Self-Service Portal (Mobile-First)**:
   - Self-registration with 6-digit cryptographic phone verification.
   - Live SMS-linked tracking screen with automated polling.
   - Out-of-band price review: one-tap **Confirm** or **Decline**.
   - Customer-initiated OTP dispatch when shoes are marked ready and paid.

2. **Repairer Dashboard**:
   - Live queue with optimistic UI and backend atomic concurrency lock (returns `409 Conflict` if another repairer attempts simultaneous claim).
   - Price proposal with catalog price-band validation. Out-of-band quotes automatically generate Owner approval tickets without premature customer dispatch.
   - Status transitions (`Started` → `Completed` / `On Hold`) with mandatory photographic proof.
   - Repairer activity ledger and revenue tracking.

3. **Owner Executive Dashboard & Back-Office**:
   - Executive KPIs: Active Jobs, Today's Inflow, Ready for Pickup, and Pending Approvals.
   - Filterable, paginated jobs table with full audit slide-over detail.
   - Daily Cash Drawer Reconciliation with variance computation and day-close record keeping.
   - Service Catalog CRUD and Staff Account Management.
   - Out-of-band Price Approval inbox and emergency Pickup Override.
   - Filterable, immutable audit trail viewer.

4. **Counter Staff Terminal**:
   - Physical intake receipting, tagging, and multi-angle photo uploads (Sharp WebP compression).
   - Staff registration on behalf of walk-in customers.
   - Payment ledger recording (M-Pesa reference and Cash), automated balance calculation.
   - Customer pickup verification via bcrypt-hashed OTP verification (rate-limited to 3 attempts).

---

## 🔒 Security & Data Integrity Architecture

| Control | Specification | Implementation |
|---------|---------------|----------------|
| **SEC-01** | Account Brute Force Protection | User lockout for 5 minutes after 5 consecutive failed login attempts. |
| **SEC-02** | Role-Based Access Control | Strict backend middleware (`requireRole('owner')`, `requireRole('repairer')`, etc.). Permissions never depend solely on frontend UI. |
| **SEC-03** | State Machine Validation | Enforces valid lifecycle transitions. Out-of-order attempts return HTTP `422 Unprocessable Entity`. |
| **SEC-04** | Cryptographic Token Entropy | Public tracking URLs use non-sequential 32-byte (64-char) cryptographic hex tokens. |
| **SEC-05** | Hashed Pickup OTPs | Customer collection OTPs are cryptographically hashed using bcrypt before database storage. Plaintext OTPs are strictly omitted from API responses and staff terminals. |
| **SEC-06** | Transport & Header Hardening | Helmet security headers, CSP, CORS origin pinning, and automatic HTTPS redirection in production. |
| **SEC-07** | Customer PII Protection | Customer contact numbers and plaintext collection tokens are shielded from repairer endpoints. |
| **IMM-01** | Immutable Audit Trail | PostgreSQL trigger-enforced constraint: `UPDATE` and `DELETE` operations on `job_events` raise database exceptions. Corrections must be inserted as new events. |
| **SESS-01** | Inactivity Auto-Logout | 5-minute idle inactivity auto-logout hook protects shared terminals at the front counter. |

---

## ⚙️ Tech Stack

- **Backend**: Node.js 20, Express 5, `pg` (PostgreSQL Client with raw SQL queries), `bcrypt`, `jsonwebtoken`, `sharp`, `multer`, `helmet`, `morgan`.
- **Database**: PostgreSQL 16/18 with `pgcrypto` and trigger-enforced audit immutability.
- **Frontend**: React 18, Vite, React Router v6, Zustand state management, Lucide React icons, Vanilla CSS Design System.
- **Reverse Proxy & Deployment**: Multi-stage Docker, Nginx Alpine, Docker Compose.

---

## 🚀 Quickstart Guide

### Option 1: Run with Docker Compose (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/Kelvin2.0.git
   cd Kelvin2.0
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```
   *(Update `DB_PASSWORD` and generate a `JWT_SECRET` via `openssl rand -hex 32` if deploying publicly).*

3. **Launch Containers**:
   ```bash
   docker compose up --build
   ```

4. **Access the application**:
   - Web Application: [http://localhost](http://localhost)
   - Backend Direct API & Health Check: [http://localhost:3001/health](http://localhost:3001/health)

---

### Option 2: Local Bare-Metal Setup

#### Prerequisites
- Node.js 20+ and npm
- PostgreSQL 16+ running locally on port `5432`

#### 1. Database Initialization
```bash
# In psql or PostgreSQL CLI
createdb kelvin_shoe_repair
psql -U postgres -d kelvin_shoe_repair -f database/schema.sql
```

#### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your local PostgreSQL credentials (e.g. DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/kelvin_shoe_repair)
npm install
npm run dev
```
Backend will start on `http://127.0.0.1:3001`.

#### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will start on `http://localhost:5173`.

---

## 🔑 Default Seed Credentials

All seeded accounts are initialized with real bcrypt hashes in `database/schema.sql`:

| Role | Email | Password | Access Area |
|------|-------|----------|-------------|
| **Owner** | `owner@safikicks.co.ke` | `ChangeMe123!` | `/owner/*` (Approvals, Reports, Day-Close, Staff, Catalog, Audit) |
| **Counter Staff** | `grace@safikicks.co.ke` | `CounterStaff123!` | `/counter/*` (Intake, Tagging, Payments, OTP Pickup Release) |
| **Repairer** | `joseph@safikicks.co.ke` | `SecureRepairer123!` | `/repairer/*` (Queue, Claim, Price Proposals, Work Completion) |

---

## 🔄 State Machine & Job Lifecycle

```
[Registered] ──(Physical Receipt)──► [In Queue] ──(Repairer Claim)──► [Claimed]
                                                                        │
                                              ┌── In-Band Price ────────┘
                                              ▼
                                   [Awaiting Confirmation]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         (Customer Declines)                             (Customer Confirms)
                      ▼                                               ▼
                 [Cancelled]                                      [Started]
                                                                      │
                                                           (Mark Completed)
                                                                      ▼
                                                                 [Completed]
                                                                      │
                                                           (Record Full Payment)
                                                                      ▼
                                                           [Completed & Paid]
                                                                      │
                                                           (Verify 6-digit OTP)
                                                                      ▼
                                                                   [Picked]
```

---

## 🧪 Testing & Verification

The repository contains automated verification suites:

- **E2E Acceptance Test Suite**:
  ```bash
  cd backend
  node tests_e2e_m14.js
  ```
  *Verifies the complete 9-stage lifecycle: customer phone verification, self-registration, counter receipt, repairer race lock claim, price quote, customer confirmation, repair completion, M-Pesa payment ledger, OTP pickup release, and full chronological audit trail.*

- **Audit Log Immutability Test**:
  ```bash
  psql -U postgres -d kelvin_shoe_repair -f database/test_immutability.sql
  ```
  *Validates that direct SQL `UPDATE` and `DELETE` queries against `job_events` are strictly rejected by the database trigger.*

---

## 📄 License & Intellectual Property

Proprietary and Confidential. Developed for Kelvin Shoe Repair & Safi Kicks Enterprises.
