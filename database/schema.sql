-- ================================================================
-- Shoe Repair Job Tracking & Revenue Control System
-- Full Database Schema — Phase 1
-- PostgreSQL 14+
-- Run with: psql -U postgres -d kelvin_shoe_repair -f schema.sql
-- ================================================================

-- ── Enable required extensions ───────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ================================================================
-- ENUMS
-- ================================================================

DO $$ BEGIN
  CREATE TYPE job_status AS ENUM (
    'Registered',
    'In Queue',
    'Awaiting Confirmation',
    'Started',
    'On Hold',
    'Completed',
    'Picked',
    'Expired',
    'Cancelled',
    'Abandoned',
    'Closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('Unpaid', 'Part-paid', 'Paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('counter_staff', 'repairer', 'owner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE photo_type AS ENUM ('receipt', 'completion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_type AS ENUM ('payment', 'reversal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE approval_type AS ENUM (
    'out_of_band_price',
    'pickup_override',
    'alternate_identifier',
    'status_reversal'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE approval_decision AS ENUM ('approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE channel AS ENUM ('self_registered', 'staff_registered');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ================================================================
-- TABLE: users
-- All staff members with individual logins.
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(120)  NOT NULL,
  role            user_role     NOT NULL,
  phone           VARCHAR(20),
  email           VARCHAR(120)  UNIQUE,
  password_hash   TEXT          NOT NULL,
  active          BOOLEAN       NOT NULL DEFAULT TRUE,
  failed_attempts INT           NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role  ON users(role);

-- ================================================================
-- TABLE: service_catalog
-- Owner-maintained list of services with price bands.
-- ================================================================
CREATE TABLE IF NOT EXISTS service_catalog (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      VARCHAR(100)  NOT NULL UNIQUE,
  min_price                 NUMERIC(10,2) NOT NULL,
  max_price                 NUMERIC(10,2),          -- NULL = no upper limit (Other)
  standard_turnaround_hours INT,
  active                    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TABLE: customers
-- Identified by verified phone number.
-- ================================================================
CREATE TABLE IF NOT EXISTS customers (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(120) NOT NULL,
  phone                 VARCHAR(20)  UNIQUE,           -- NULL if no phone (alternate_identifier used)
  alternate_identifier  TEXT,                          -- requires owner approval
  alternate_approved_by UUID         REFERENCES users(id),
  consent_given         BOOLEAN      NOT NULL DEFAULT FALSE,
  consent_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- ================================================================
-- TABLE: jobs
-- Core entity. One job = one pair or one item.
-- ================================================================
CREATE TABLE IF NOT EXISTS jobs (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number       VARCHAR(20)     NOT NULL UNIQUE,   -- e.g. SRJ-20261001-001
  access_token     VARCHAR(64)     NOT NULL UNIQUE,   -- 32-byte hex, used in SMS links
  customer_id      UUID            NOT NULL REFERENCES customers(id),
  service_id       UUID            NOT NULL REFERENCES service_catalog(id),
  shoe_brand       VARCHAR(100),
  shoe_color       VARCHAR(80),
  notes            TEXT,
  status           job_status      NOT NULL DEFAULT 'Registered',
  payment_status   payment_status  NOT NULL DEFAULT 'Unpaid',
  channel          channel         NOT NULL DEFAULT 'self_registered',
  received_by      UUID            REFERENCES users(id),
  assigned_repairer UUID           REFERENCES users(id),
  registered_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  received_at      TIMESTAMPTZ,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  picked_at        TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,                       -- registered_at + 48h
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_status            ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id       ON jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_repairer ON jobs(assigned_repairer);
CREATE INDEX IF NOT EXISTS idx_jobs_access_token      ON jobs(access_token);
CREATE INDEX IF NOT EXISTS idx_jobs_registered_at     ON jobs(registered_at DESC);

-- ================================================================
-- TABLE: photos
-- Receipt photos (before) and completion photos (after).
-- ================================================================
CREATE TABLE IF NOT EXISTS photos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     UUID        NOT NULL REFERENCES jobs(id),
  type       photo_type  NOT NULL,
  file_url   TEXT        NOT NULL,
  taken_by   UUID        NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_job_id ON photos(job_id);

-- ================================================================
-- TABLE: price_versions
-- Append-only pricing history. Never update/delete a row.
-- ================================================================
CREATE TABLE IF NOT EXISTS price_versions (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID          NOT NULL REFERENCES jobs(id),
  version_number    INT           NOT NULL,
  amount            NUMERIC(10,2) NOT NULL,
  proposed_by       UUID          NOT NULL REFERENCES users(id),
  approved_by       UUID          REFERENCES users(id),
  customer_response VARCHAR(20),                      -- 'confirmed' | 'declined' | NULL
  responded_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_price_versions_job_id ON price_versions(job_id);

-- ================================================================
-- TABLE: payments
-- Append-only payment ledger. Reversals are new rows (type='reversal').
-- ================================================================
CREATE TABLE IF NOT EXISTS payments (
  id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID            NOT NULL REFERENCES jobs(id),
  amount      NUMERIC(10,2)   NOT NULL,
  method      VARCHAR(40)     NOT NULL,               -- 'cash' | 'mpesa' | 'card'
  reference   VARCHAR(100),                           -- M-Pesa code, card ref, etc.
  verified    BOOLEAN         NOT NULL DEFAULT FALSE,
  received_by UUID            NOT NULL REFERENCES users(id),
  type        payment_type    NOT NULL DEFAULT 'payment',
  notes       TEXT,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
  -- Intentionally no updated_at — payments are immutable
);

CREATE INDEX IF NOT EXISTS idx_payments_job_id     ON payments(job_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- ================================================================
-- TABLE: pickup_codes
-- Hashed OTP for shoe release. Never expose plain code via API.
-- ================================================================
CREATE TABLE IF NOT EXISTS pickup_codes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     UUID        NOT NULL REFERENCES jobs(id),
  code_hash  TEXT        NOT NULL,                   -- bcrypt hash of 6-digit OTP
  expires_at TIMESTAMPTZ NOT NULL,
  attempts   INT         NOT NULL DEFAULT 0,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pickup_codes_job_id ON pickup_codes(job_id);

-- ================================================================
-- TABLE: approvals
-- Out-of-band price approvals, pickup overrides, etc.
-- ================================================================
CREATE TABLE IF NOT EXISTS approvals (
  id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID              NOT NULL REFERENCES jobs(id),
  type         approval_type     NOT NULL,
  requested_by UUID              NOT NULL REFERENCES users(id),
  decided_by   UUID              REFERENCES users(id),
  decision     approval_decision,
  reason       TEXT,
  requested_at TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  decided_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_approvals_job_id  ON approvals(job_id);
CREATE INDEX IF NOT EXISTS idx_approvals_decision ON approvals(decision) WHERE decision IS NULL;

-- ================================================================
-- TABLE: job_events (Audit Log)
-- APPEND-ONLY. Protected by triggers. Never update or delete.
-- ================================================================
CREATE TABLE IF NOT EXISTS job_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID        NOT NULL REFERENCES jobs(id),
  actor_user_id UUID        REFERENCES users(id),
  actor_label   VARCHAR(60),                -- 'customer' | 'system' | staff name
  event_type    VARCHAR(80) NOT NULL,
  old_value     JSONB,
  new_value     JSONB,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updated_at intentionally
);

CREATE INDEX IF NOT EXISTS idx_job_events_job_id     ON job_events(job_id);
CREATE INDEX IF NOT EXISTS idx_job_events_created_at ON job_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_events_event_type ON job_events(event_type);

-- ── Immutability triggers for job_events ─────────────────────
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries are immutable. Corrections must be recorded as new entries.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_audit_update ON job_events;
CREATE TRIGGER no_audit_update
  BEFORE UPDATE ON job_events
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

DROP TRIGGER IF EXISTS no_audit_delete ON job_events;
CREATE TRIGGER no_audit_delete
  BEFORE DELETE ON job_events
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

-- ================================================================
-- TABLE: day_close
-- Daily cash reconciliation records.
-- ================================================================
CREATE TABLE IF NOT EXISTS day_close (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  close_date            DATE          NOT NULL UNIQUE,
  cash_expected         NUMERIC(10,2),                -- computed from jobs
  cash_counted          NUMERIC(10,2),                -- physically counted by owner
  bank_deposit_reference TEXT,
  closed_by             UUID          NOT NULL REFERENCES users(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_day_close_date ON day_close(close_date DESC);

-- ================================================================
-- TABLE: sms_log
-- Audit log of SMS dispatches for volume tracking and analytics.
-- ================================================================
CREATE TABLE IF NOT EXISTS sms_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       VARCHAR(20) NOT NULL,
  message     TEXT        NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'sent',
  message_id  VARCHAR(100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_log_created_at ON sms_log(created_at DESC);

-- ================================================================
-- TABLE: phone_verifications
-- Short-lived codes sent to customers for registration verification.
-- ================================================================
CREATE TABLE IF NOT EXISTS phone_verifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      VARCHAR(20) NOT NULL,
  code_hash  TEXT        NOT NULL,                   -- bcrypt hash of 6-digit code
  expires_at TIMESTAMPTZ NOT NULL,
  attempts   INT         NOT NULL DEFAULT 0,
  used       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);

-- ================================================================
-- SEED DATA: Service Catalog
-- ================================================================
INSERT INTO service_catalog (name, min_price, max_price, standard_turnaround_hours)
VALUES
  ('Basic Cleaning',   200, 500,  24),
  ('Deep Cleaning',    250, 500,  48),
  ('Shoe Whitening',   500, 500,  24),
  ('Suede Cleaning',   300, 300,  48),
  ('Shoe Repair',      500, 500,  72),
  ('Shoe Restoration', 700, 700,  96),
  ('Deodorization',    300, 300,  24),
  ('Stain Removal',    300, 300,  24),
  ('Other',            0,   NULL, NULL)
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- SEED DATA: Default Owner Account
-- Password: ChangeMe123! (MUST be changed on first login)
-- bcrypt hash generated with 12 rounds
-- ================================================================
-- NOTE: Generate a real hash with: node -e "console.log(require('bcrypt').hashSync('ChangeMe123!', 12))"
-- Then replace the placeholder below before running in production.
INSERT INTO users (name, role, email, password_hash)
VALUES (
  'Shop Owner',
  'owner',
  'owner@solecare.co.ke',
  '$2b$12$PLACEHOLDER_REPLACE_WITH_REAL_BCRYPT_HASH_OF_ChangeMe123!'
)
ON CONFLICT (email) DO NOTHING;

-- ================================================================
-- END OF SCHEMA
-- ================================================================
