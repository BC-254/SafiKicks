# Shoe Repair Job Tracking & Revenue Control System
## Phase 1 — Master Build Workplan

> [!IMPORTANT]
> **Session Continuity Protocol:** This document is the single source of truth for every build session. At the start of each session, read this file first. Find the last `✅ DONE` marker, then continue from the next `[ ]` task. Never re-do completed tasks. Mark tasks `✅ DONE` immediately upon completion. Commit frequently.

---

## 📐 Design System & UI Philosophy

### Core Design Mandate — Apple-Like Aesthetic

The UI must feel native, calm, and purposeful — not "AI chatbot" or "SaaS dashboard." Obey these rules throughout **every screen, every component, every dashboard**:

| Principle | Rule |
|-----------|------|
| **Color** | White `#FFFFFF` and off-white `#F5F5F7` backgrounds. Single accent: `#1D1D1F` (almost black). One brand color: a muted warm-gray or a single restrained hue (e.g. `#0071E3` Apple-blue) used sparingly for CTAs only. NO multi-color gradients. NO neon. NO dark glass cards. |
| **Typography** | SF Pro / Inter / system-ui. Headline weights 600–700. Body 400. Labels 500. Line-height generous (1.5–1.7). Letter-spacing slightly tight on headings. |
| **Cards** | Flat white `#FFFFFF` with `border-radius: 18px`, `box-shadow: 0 2px 12px rgba(0,0,0,0.07)`. Border: none or `1px solid #E5E5E5`. NO colored card headers. |
| **Buttons** | Pill-shaped (`border-radius: 980px`). Primary: filled `#1D1D1F`, white text. Secondary: white with `1px solid #D2D2D7`. Danger: `#FF3B30`. NO gradients on buttons. |
| **Spacing** | 8px grid. Generous white-space. Content max-width `1100px` centered on desktop. Mobile padding `16px`. |
| **Animations** | `transition: all 0.2s ease`. Subtle scale on press (`scale(0.98)`). NO bouncing, NO confetti, NO heavy CSS animations. |
| **Status Badges** | Tiny pill. Neutral grays/warm tones. e.g. Registered=gray, In Queue=blue-gray, Started=amber, Completed=green, Picked=purple, Cancelled=red. All desaturated. |
| **Icons** | SF Symbols look-alikes or Lucide React. Stroke-only. 1.5px stroke weight. |
| **Navigation** | Tab bar on mobile (bottom). Sidebar on desktop (left, 240px, white). NO hamburger menus. |
| **Forms** | Floating label inputs. `border-radius: 12px`. Light gray border `#D2D2D7`, `1px`. Focus ring: `2px solid #0071E3`. |
| **Tables** | Borderless rows. Alternating very subtle `#FAFAFA`. Row hover `#F5F5F7`. |
| **NO** | NO "AI Generated" section headers, NO glowing cards, NO glassmorphism, NO particle animations, NO excessive emojis in UI labels. |

---

## 🏗️ Architecture Overview

```
Kelvin2.0/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── app.js              # Express app entry
│   │   ├── config/
│   │   │   ├── db.js           # PostgreSQL connection (pg)
│   │   │   ├── env.js          # Env var validation
│   │   │   └── constants.js    # Status enums, roles, price bands
│   │   ├── middleware/
│   │   │   ├── auth.js         # JWT verify + role check
│   │   │   ├── rateLimiter.js  # express-rate-limit
│   │   │   └── errorHandler.js
│   │   ├── models/             # Raw SQL query helpers (no ORM)
│   │   │   ├── customer.js
│   │   │   ├── job.js
│   │   │   ├── photo.js
│   │   │   ├── price.js
│   │   │   ├── payment.js
│   │   │   ├── pickup.js
│   │   │   ├── approval.js
│   │   │   ├── auditLog.js
│   │   │   ├── serviceCatalog.js
│   │   │   ├── user.js
│   │   │   └── dayClose.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── registration.routes.js
│   │   │   ├── receipt.routes.js
│   │   │   ├── repairer.routes.js
│   │   │   ├── pricing.routes.js
│   │   │   ├── payment.routes.js
│   │   │   ├── pickup.routes.js
│   │   │   ├── owner.routes.js
│   │   │   ├── catalog.routes.js
│   │   │   └── audit.routes.js
│   │   ├── services/
│   │   │   ├── sms.service.js  # SMS provider abstraction
│   │   │   ├── otp.service.js  # Crypto OTP gen + hashing
│   │   │   ├── stateMachine.js # Job status transitions
│   │   │   ├── pricing.service.js
│   │   │   └── photo.service.js # Compression + storage
│   │   └── utils/
│   │       ├── token.js        # Secure random token generator
│   │       ├── logger.js
│   │       └── pagination.js
│   ├── migrations/             # SQL migration files (numbered)
│   ├── seeds/                  # Dev seed data
│   ├── .env.example
│   └── package.json
│
├── frontend/                   # React + Vite SPA
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx             # Router root
│   │   ├── design-system/      # Shared Apple-like components
│   │   │   ├── tokens.css      # CSS custom properties (colors, spacing, radii)
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Input.jsx       # Floating label
│   │   │   ├── Modal.jsx
│   │   │   ├── Toast.jsx
│   │   │   ├── Spinner.jsx
│   │   │   ├── Table.jsx
│   │   │   └── StatusBadge.jsx
│   │   ├── layouts/
│   │   │   ├── CustomerLayout.jsx   # Mobile-first, no sidebar
│   │   │   ├── StaffLayout.jsx      # Sidebar desktop, tab bar mobile
│   │   │   └── OwnerLayout.jsx      # Full sidebar with subnav
│   │   ├── views/
│   │   │   ├── customer/           # Public-facing (no auth)
│   │   │   │   ├── RegisterPage.jsx
│   │   │   │   ├── VerifyPhonePage.jsx
│   │   │   │   ├── JobStatusPage.jsx      # Accessed via SMS link
│   │   │   │   ├── PriceConfirmPage.jsx   # Confirm/Decline price
│   │   │   │   └── PickupStatusPage.jsx
│   │   │   ├── repairer/           # Auth: role=repairer
│   │   │   │   ├── QueuePage.jsx          # Repair queue
│   │   │   │   ├── JobDetailPage.jsx      # Claim, price, progress
│   │   │   │   ├── PickupPage.jsx         # Enter OTP
│   │   │   │   └── MyActivityPage.jsx
│   │   │   ├── counter/            # Auth: role=counter_staff
│   │   │   │   ├── ReceiptPage.jsx        # Tag + photo upload
│   │   │   │   ├── RegisterForCustomerPage.jsx
│   │   │   │   ├── PaymentPage.jsx
│   │   │   │   └── AllJobsPage.jsx
│   │   │   └── owner/              # Auth: role=owner
│   │   │       ├── DashboardPage.jsx      # Daily overview
│   │   │       ├── ReconciliationPage.jsx # Day close
│   │   │       ├── JobsPage.jsx           # All jobs + filters
│   │   │       ├── AuditPage.jsx          # Audit trail
│   │   │       ├── ApprovalsPage.jsx      # Pending approvals
│   │   │       ├── CatalogPage.jsx        # Service catalog CRUD
│   │   │       ├── StaffPage.jsx          # Staff accounts
│   │   │       └── ReportsPage.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useJobs.js
│   │   │   ├── useToast.js
│   │   │   └── usePolling.js      # Real-time updates via polling
│   │   ├── store/                 # Zustand state
│   │   │   ├── authStore.js
│   │   │   └── jobStore.js
│   │   ├── api/                   # Axios API client modules
│   │   │   ├── client.js          # Axios instance + interceptors
│   │   │   ├── auth.api.js
│   │   │   ├── jobs.api.js
│   │   │   ├── pricing.api.js
│   │   │   ├── payments.api.js
│   │   │   ├── pickup.api.js
│   │   │   └── owner.api.js
│   │   └── utils/
│   │       ├── formatters.js      # Date, currency (KES), status
│   │       └── validators.js
│   ├── public/
│   │   └── favicon.ico
│   ├── index.html
│   └── vite.config.js
│
├── database/
│   └── schema.sql              # Full SQL schema (reference)
│
├── docs/
│   └── SRS.md                  # Copied requirements
│
├── WORKPLAN.md                 # THIS FILE — master workplan
└── README.md
```

---

## 📊 Database Schema (Full Reference)

```sql
-- 001_create_enums.sql
CREATE TYPE job_status AS ENUM (
  'Registered', 'In Queue', 'Awaiting Confirmation',
  'Started', 'On Hold', 'Completed', 'Picked',
  'Expired', 'Cancelled', 'Abandoned', 'Closed'
);
CREATE TYPE payment_status AS ENUM ('Unpaid', 'Part-paid', 'Paid');
CREATE TYPE user_role AS ENUM ('counter_staff', 'repairer', 'owner');
CREATE TYPE photo_type AS ENUM ('receipt', 'completion');
CREATE TYPE payment_type AS ENUM ('payment', 'reversal');
CREATE TYPE approval_type AS ENUM ('out_of_band_price', 'pickup_override', 'alternate_identifier', 'status_reversal');
CREATE TYPE approval_decision AS ENUM ('approved', 'rejected');
CREATE TYPE channel AS ENUM ('self_registered', 'staff_registered');

-- 002_create_users.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  role user_role NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(120),
  password_hash TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  failed_attempts INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 003_create_service_catalog.sql
CREATE TABLE service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  min_price NUMERIC(10,2) NOT NULL,
  max_price NUMERIC(10,2),          -- NULL = fixed price
  standard_turnaround_hours INT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Seed: Basic Cleaning 200-500, Deep Cleaning 250-500, Shoe Whitening 500(fixed), etc.

-- 004_create_customers.sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) UNIQUE,         -- verified
  alternate_identifier TEXT,
  alternate_approved_by UUID REFERENCES users(id),
  consent_given BOOLEAN DEFAULT FALSE,
  consent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 005_create_jobs.sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number VARCHAR(20) NOT NULL UNIQUE, -- e.g. SRJ-20261001-001
  access_token VARCHAR(64) NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  service_id UUID NOT NULL REFERENCES service_catalog(id),
  shoe_brand VARCHAR(100),
  shoe_color VARCHAR(80),
  notes TEXT,
  status job_status NOT NULL DEFAULT 'Registered',
  payment_status payment_status NOT NULL DEFAULT 'Unpaid',
  channel channel NOT NULL DEFAULT 'self_registered',
  received_by UUID REFERENCES users(id),
  assigned_repairer UUID REFERENCES users(id),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  received_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  picked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,           -- registered_at + 48h
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 006_create_photos.sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  type photo_type NOT NULL,
  file_url TEXT NOT NULL,
  taken_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 007_create_price_versions.sql
CREATE TABLE price_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  version_number INT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  proposed_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  customer_response VARCHAR(20),    -- 'confirmed' | 'declined' | NULL
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 008_create_payments.sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  amount NUMERIC(10,2) NOT NULL,
  method VARCHAR(40) NOT NULL,      -- 'cash' | 'mpesa' | 'card'
  reference VARCHAR(100),
  verified BOOLEAN DEFAULT FALSE,
  received_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  type payment_type NOT NULL DEFAULT 'payment',
  notes TEXT
);

-- 009_create_pickup_codes.sql
CREATE TABLE pickup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 010_create_approvals.sql
CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  type approval_type NOT NULL,
  requested_by UUID NOT NULL REFERENCES users(id),
  decided_by UUID REFERENCES users(id),
  decision approval_decision,
  reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

-- 011_create_audit_log.sql
CREATE TABLE job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id),
  actor_user_id UUID REFERENCES users(id),
  actor_label VARCHAR(60),          -- 'customer' | 'system' | user name
  event_type VARCHAR(80) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
  -- NO UPDATE, NO DELETE — append-only enforced by trigger
);

-- 012_create_day_close.sql
CREATE TABLE day_close (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  close_date DATE NOT NULL UNIQUE,
  cash_expected NUMERIC(10,2),
  cash_counted NUMERIC(10,2),
  bank_deposit_reference TEXT,
  closed_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 013_create_verification_codes.sql
CREATE TABLE phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT DEFAULT 0,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: prevent UPDATE/DELETE on job_events
CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit log entries are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_audit_update BEFORE UPDATE ON job_events FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
CREATE TRIGGER no_audit_delete BEFORE DELETE ON job_events FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
```

---

## 🔄 Job State Machine (Enforced Backend)

```
Registered  ──►  In Queue  ──►  Awaiting Confirmation  ──►  Started
    │                                    │                      │
    ▼                                    ▼                      ▼
  Expired                           Cancelled             On Hold ◄──┐
                                                               │     │
                                                               ▼     │
                                                          Started ───┘
                                                               │
                                                               ▼
                                                          Completed
                                                               │
                                                        ┌──────┴──────┐
                                                        ▼             ▼
                                                      Picked       Abandoned
                                                        │             │
                                                        ▼             ▼
                                                      Closed        Closed
```

**Valid transitions table (backend enforced):**

| From | To | Allowed By |
|------|----|------------|
| Registered | In Queue | counter_staff, owner |
| Registered | Expired | system (cron) |
| In Queue | Awaiting Confirmation | repairer (after claim + price) |
| Awaiting Confirmation | Started | customer (price confirmed) |
| Awaiting Confirmation | Cancelled | customer (price declined), owner |
| Started | Completed | repairer, owner |
| Started | On Hold | repairer, owner |
| On Hold | Started | customer (new price confirmed), owner |
| On Hold | Cancelled | customer (new price declined), owner |
| Completed | Picked | repairer/counter (OTP verified), owner override |
| Completed | Abandoned | system (cron after 30 days) |
| Picked | Closed | system |
| Expired | Closed | system |
| Cancelled | Closed | system |
| Abandoned | Closed/Picked | owner decision |

---

## 🎨 Design Tokens (CSS Custom Properties)

```css
:root {
  /* Colors */
  --color-bg: #F5F5F7;
  --color-surface: #FFFFFF;
  --color-surface-secondary: #FAFAFA;
  --color-border: #E5E5EA;
  --color-border-light: #F2F2F7;
  --color-text-primary: #1D1D1F;
  --color-text-secondary: #6E6E73;
  --color-text-tertiary: #AEAEB2;
  --color-accent: #0071E3;
  --color-accent-hover: #0077ED;
  --color-danger: #FF3B30;
  --color-success: #34C759;
  --color-warning: #FF9500;

  /* Status Colors (desaturated) */
  --status-registered: #8E8E93;
  --status-queue: #5AC8FA;
  --status-awaiting: #FF9F0A;
  --status-started: #30B0C7;
  --status-hold: #FF6B35;
  --status-completed: #30D158;
  --status-picked: #BF5AF2;
  --status-expired: #636366;
  --status-cancelled: #FF453A;
  --status-abandoned: #FF6B35;

  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
  --font-size-xs: 11px;
  --font-size-sm: 13px;
  --font-size-base: 15px;
  --font-size-md: 17px;
  --font-size-lg: 22px;
  --font-size-xl: 28px;
  --font-size-2xl: 34px;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing (8px grid) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 18px;
  --radius-xl: 24px;
  --radius-pill: 980px;

  /* Shadows */
  --shadow-sm: 0 1px 4px rgba(0,0,0,0.06);
  --shadow-md: 0 2px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);

  /* Transitions */
  --transition-base: all 0.2s ease;
}
```

---

## 🧩 Three Dashboards — Screen-by-Screen Specification

### 1. Customer View (Public, No Auth)

Mobile-first single-column layout. Max-width 480px centered on desktop.

#### Pages:
| Route | Component | Description |
|-------|-----------|-------------|
| `/register` | `RegisterPage` | Name, phone, shoe brand/color, service. Privacy consent. |
| `/verify` | `VerifyPhonePage` | 6-digit SMS OTP entry. Resend after 60s. |
| `/job/:token` | `JobStatusPage` | Read-only job status timeline. Updated via polling. |
| `/job/:token/confirm-price` | `PriceConfirmPage` | Show proposed price + range. Confirm / Decline buttons. |
| `/job/:token/pickup` | `PickupStatusPage` | Show pickup code request status, balance due. |

**RegisterPage layout:**
```
┌─────────────────────────────────┐
│  🔵 Logo / Shop Name            │
│  ─────────────────────────      │
│  Drop your shoes off            │  ← heading, 28px semibold
│  Fill in your details below     │  ← subheading, 15px secondary
│                                 │
│  [  Full Name           ]       │  ← floating label input
│  [  Phone (+254...)     ]       │
│  [  Shoe Brand          ]       │
│  [  Shoe Color          ]       │
│  [  Service ▾           ]       │  ← dropdown
│                                 │
│  ℹ Price range: KES 200 – 500   │  ← appears after service select
│                                 │
│  □ I agree to the privacy...    │  ← checkbox
│                                 │
│  [  Continue →          ]       │  ← filled pill button
└─────────────────────────────────┘
```

**JobStatusPage layout:**
```
┌─────────────────────────────────┐
│  ← Back   Your Job  #SRJ-001   │
│  ─────────────────────────      │
│  [StatusBadge: In Queue]        │
│  Nike Air Max · Basic Cleaning  │
│                                 │
│  Timeline                       │
│  ● Registered        Oct 14     │
│  ● Shoes Received    Oct 14     │
│  ○ Price Confirmed              │
│  ○ Repair Started               │
│  ○ Ready for Pickup             │
│                                 │
│  [Request Pickup Code]          │  ← only when Completed + Paid
└─────────────────────────────────┘
```

---

### 2. Repairer Dashboard (Auth: role=repairer)

Sidebar on desktop (240px white). Bottom tab bar on mobile (4 tabs: Queue, My Jobs, Pickup, Activity).

#### Pages:
| Route | Component | Description |
|-------|-----------|-------------|
| `/repairer/queue` | `QueuePage` | All "In Queue" jobs. Claim button. |
| `/repairer/jobs/:id` | `JobDetailPage` | Full job view. Price proposal. Status updates. |
| `/repairer/pickup` | `PickupPage` | Enter OTP for a customer picking up. |
| `/repairer/activity` | `MyActivityPage` | Own jobs history + stats. |

**QueuePage layout:**
```
┌──────────────────────────────────────────────────┐
│ Repair Queue              [3 jobs waiting]        │
│ ─────────────────────────────────────────────    │
│ ┌──────────────────────────────────────────┐    │
│ │ #SRJ-001  Nike Air Max  Basic Cleaning   │    │
│ │ Blue • Received 2h ago                   │    │
│ │ KES 200–500  [Claim Job →]               │    │
│ └──────────────────────────────────────────┘    │
│ ┌──────────────────────────────────────────┐    │
│ │ #SRJ-002  Adidas Samba  Deep Cleaning    │    │
│ │ White • Received 4h ago                  │    │
│ │ KES 250–500  [Claim Job →]               │    │
│ └──────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

**JobDetailPage layout (after claim):**
```
┌──────────────────────────────────────────────────┐
│ ← Queue    #SRJ-001                              │
│ [StatusBadge: Started]                           │
│ ─────────────────────────────────────────────    │
│ Customer        John Doe                         │
│ Service         Basic Cleaning                   │
│ Shoes           Nike Air Max · Blue              │
│ Price Range     KES 200 – 500                    │
│                                                  │
│ ── Propose Price ─────────────────────────────   │
│ [  Amount (KES)         ]                        │
│ [  Notes (optional)     ]                        │
│ [  Submit Price         ]  ← pill button         │
│                                                  │
│ ── Receipt Photos ────────────────────────────   │
│ [Photo 1] [Photo 2]                              │
│                                                  │
│ ── Progress ──────────────────────────────────   │
│ [Mark Completed] [Put On Hold]                   │
│                                                  │
│ ── Audit Timeline ────────────────────────────   │
│ 14 Oct 09:00  Registered  (customer)             │
│ 14 Oct 09:15  In Queue    (counter: Alice)       │
└──────────────────────────────────────────────────┘
```

**PickupPage layout:**
```
┌──────────────────────────────────────────────────┐
│ Release Shoes                                    │
│ ─────────────────────────────────────────────    │
│ [  Job Number            ]                       │
│ [  Enter 6-digit OTP     ]                       │
│ [  Verify & Release  →   ]                       │
│                                                  │
│ If customer lost code:                           │
│ [Request Owner Override]  ← secondary button     │
└──────────────────────────────────────────────────┘
```

---

### 3. Owner Dashboard (Auth: role=owner)

Full sidebar with subnav groups. Wide content area. Dense data tables. Export buttons.

#### Pages:
| Route | Component | Description |
|-------|-----------|-------------|
| `/owner/dashboard` | `DashboardPage` | KPI cards + today's jobs summary |
| `/owner/reconciliation` | `ReconciliationPage` | Day-close cash reconciliation |
| `/owner/jobs` | `JobsPage` | All jobs, filters, search |
| `/owner/approvals` | `ApprovalsPage` | Pending price/override approvals |
| `/owner/audit` | `AuditPage` | Full immutable audit trail |
| `/owner/catalog` | `CatalogPage` | Service catalog CRUD |
| `/owner/staff` | `StaffPage` | Staff accounts CRUD |
| `/owner/reports` | `ReportsPage` | Revenue + SMS volume |

**DashboardPage layout:**
```
┌──────────────────────────────────────────────────────────────┐
│ Good morning, Kelvin         Wednesday, 14 Oct 2026          │
│ ──────────────────────────────────────────────────────────   │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │ 12       │ │ KES 8,400│ │ 3        │ │ 1        │        │
│ │ Active   │ │ Revenue  │ │ Ready    │ │ Pending  │        │
│ │ Jobs     │ │ Today    │ │ Pickup   │ │ Approval │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
│                                                              │
│ Today's Jobs                                  [View All →]  │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ # │ Customer │ Service │ Status │ Price │ Payment    │   │
│ │ ──┼──────────┼─────────┼────────┼───────┼──────────  │   │
│ │ … │ John Doe │ Basic   │ [Done] │ 350   │ [Paid]     │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ Cash Reconciliation Today              [Start Day Close →]  │
│ Expected: KES 8,400 · Recorded: KES 7,900 · Δ KES 500     │
└──────────────────────────────────────────────────────────────┘
```

**Sidebar structure:**
```
● Overview
● Jobs
  ├ All Jobs
  └ Approvals
● Finance
  ├ Daily Reconciliation
  └ Reports
● Audit Trail
● Settings
  ├ Service Catalog
  └ Staff Accounts
```

---

## 📋 Phase 1 Task Breakdown (Ordered, Resumable)

Each task is atomic. Complete and mark `✅ DONE` before moving to the next.

---

### MILESTONE 0 — Project Setup

- ✅ DONE **M0-01** Initialize Git repo, create folder structure as per architecture above
- ✅ DONE **M0-02** Backend: `npm init`, install deps: `express pg bcrypt jsonwebtoken crypto uuid dotenv express-rate-limit multer sharp cors helmet morgan`
- ✅ DONE **M0-03** Frontend: `npm create vite@latest frontend -- --template react`, install: `axios zustand react-router-dom lucide-react`
- ✅ DONE **M0-04** Create `.env.example` with all required variables (DB_URL, JWT_SECRET, SMS_API_KEY, UPLOAD_PATH, etc.)
- ✅ DONE **M0-05** Create `backend/src/config/constants.js` — all enums, price bands, timeouts
- ✅ DONE **M0-06** Create `database/schema.sql` with all 13 migration files as one reference file
- ✅ DONE **M0-07** Set up PostgreSQL locally; run schema; verify all tables and trigger exist
- ✅ DONE **M0-08** Create `design-system/tokens.css` with all CSS custom properties
- ✅ DONE **M0-09** Commit: "chore: project scaffold and schema"

---

### MILESTONE 1 — Backend Core Infrastructure

- ✅ DONE **M1-01** `backend/src/app.js` — Express app with CORS, helmet, morgan, JSON body parser, rate limiter global
- ✅ DONE **M1-02** `backend/src/config/db.js` — pg Pool with connection test on startup
- ✅ DONE **M1-03** `backend/src/utils/token.js` — `generateSecureToken(bytes)` using `crypto.randomBytes`, `generateJobNumber()` (SRJ-YYYYMMDD-NNN)
- ✅ DONE **M1-04** `backend/src/utils/logger.js` — structured console logger with timestamps
- ✅ DONE **M1-05** `backend/src/middleware/errorHandler.js` — centralized error handler, no stack traces in production
- ✅ DONE **M1-06** `backend/src/middleware/auth.js` — JWT verify middleware; `requireRole(...roles)` higher-order function
- ✅ DONE **M1-07** `backend/src/middleware/rateLimiter.js` — per-route limiters (registration: 5/hr/IP, OTP: 3/15min/phone)
- ✅ DONE **M1-08** `backend/src/services/stateMachine.js` — `isValidTransition(from, to, actorRole)` function; exports transition map
- ✅ DONE **M1-09** `backend/src/services/otp.service.js` — `generateOTP()` (6-digit crypto-secure), `hashOTP(code)`, `verifyOTP(code, hash)`
- ✅ DONE **M1-10** `backend/src/services/sms.service.js` — `sendSMS(phone, message)` abstraction; mock mode for dev (console.log)
- ✅ DONE **M1-11** `backend/src/models/auditLog.js` — `logEvent({jobId, actorUserId, actorLabel, eventType, oldValue, newValue, notes})`
- ✅ DONE **M1-12** Commit: "feat: backend core infrastructure"

---

### MILESTONE 2 — Auth & Staff Login

- ✅ DONE **M2-01** `backend/src/models/user.js` — `findByEmail`, `create`, `updateFailedAttempts`, `lockUser`, `unlock`
- ✅ DONE **M2-02** `POST /api/auth/login` — bcrypt compare; lockout after 5 fails (5 min); return JWT with `{id, name, role}`
- ✅ DONE **M2-03** `POST /api/auth/logout` — client-side token invalidation (stateless) + optional token blacklist in Redis/DB
- ✅ DONE **M2-04** `GET /api/auth/me` — return current user from JWT
- ✅ DONE **M2-05** `POST /api/owner/staff` — create staff account (owner only); hash password
- ✅ DONE **M2-06** `GET /api/owner/staff` — list all staff (owner only)
- ✅ DONE **M2-07** `PATCH /api/owner/staff/:id` — update name/role/active (owner only)
- ✅ DONE **M2-08** Frontend: `LoginPage.jsx` — email + password. Apple-style card centered. Error states (locked, wrong).
- ✅ DONE **M2-09** Frontend: `authStore.js` (Zustand) — `user`, `login()`, `logout()`, `isAuthenticated`
- ✅ DONE **M2-10** Frontend: `PrivateRoute.jsx` — redirects to `/login` if not authenticated or wrong role
- ✅ DONE **M2-11** Frontend: `StaffPage.jsx` (Owner) — list staff, add staff modal, toggle active
- ✅ DONE **M2-12** Commit: "feat: auth and staff management"

---

### MILESTONE 3 — Service Catalog

- ✅ DONE **M3-01** `backend/src/models/serviceCatalog.js` — CRUD helpers
- ✅ DONE **M3-02** `GET /api/catalog` — public endpoint (no auth); returns active services with price ranges
- ✅ DONE **M3-03** `POST /api/owner/catalog` — create service (owner)
- ✅ DONE **M3-04** `PATCH /api/owner/catalog/:id` — update service (owner)
- ✅ DONE **M3-05** `DELETE /api/owner/catalog/:id` — soft delete (set active=false) (owner)
- ✅ DONE **M3-06** Seed catalog with 9 services from spec (Basic Cleaning 200–500, Deep Cleaning 250–500, Shoe Whitening 500 fixed, Suede Cleaning 300 fixed, Shoe Repair 500 fixed, Shoe Restoration 700 fixed, Deodorization 300 fixed, Stain Removal 300 fixed, Other any)
- ✅ DONE **M3-07** Frontend: `CatalogPage.jsx` — table of services with inline edit; add/deactivate. Apple-style sheet modal for add.
- ✅ DONE **M3-08** Commit: "feat: service catalog"

---

### MILESTONE 4 — Customer Registration Portal

- ✅ DONE **M4-01** `POST /api/register/verify-phone` — send OTP SMS; rate limit 3/15min/phone; store hash in `phone_verifications`
- ✅ DONE **M4-02** `POST /api/register/confirm-phone` — verify OTP; mark used; return session token (short-lived JWT, no role)
- ✅ DONE **M4-03** `POST /api/register/job` — requires valid phone session; create customer + job; send "Job registered" SMS with token link; log to audit
- ✅ DONE **M4-04** `GET /api/job/:token` — public; return job status + timeline (no PII except own)
- ✅ DONE **M4-05** `GET /api/register/catalog` — public; same as `/api/catalog`
- ✅ DONE **M4-06** Frontend: `CustomerLayout.jsx` — white background, max-width 480px, centered, no sidebar
- ✅ DONE **M4-07** Frontend: `RegisterPage.jsx` — multi-step form (Step 1: details; Step 2: OTP; Step 3: success). Floating label inputs. Service dropdown shows price range on select. Privacy consent checkbox.
- ✅ DONE **M4-08** Frontend: Integrated OTP 6-box input with 60s resend timer and error handling in registration flow.
- ✅ DONE **M4-09** Frontend: `JobStatusPage.jsx` — job number + status badge + 5-stage animated stepper. Polling every 20s. Mobile-optimized.
- ✅ DONE **M4-10** Handle registration expiry: background helper sets status to `Expired` for jobs where `expires_at < NOW()` and status = `Registered`. Log event.
- ✅ DONE **M4-11** Commit: "feat: customer registration portal"

---

### MILESTONE 5 — Counter Staff: Receipt, Tagging & Photos

- ✅ DONE **M5-01** `POST /api/receipt/:jobId/receive` — auth: counter_staff|owner; validate status=Registered; transition to In Queue; set `received_by`, `received_at`; log event
- ✅ DONE **M5-02** `POST /api/receipt/:jobId/photos` — auth: counter_staff|owner; multer upload (max 5 files); compress with sharp (max 1200px, 80% quality); store; log event
- ✅ DONE **M5-03** `GET /api/receipt/lookup` — auth: counter_staff|owner; search jobs by job_number or phone (partial)
- ✅ DONE **M5-04** `POST /api/register/staff-job` — auth: counter_staff|owner; register job on behalf of customer; flag `channel='staff_registered'`; same SMS flow; log with flagged note
- ✅ DONE **M5-05** Frontend: `StaffLayout.jsx` — sidebar (desktop), bottom tab bar (mobile, 4 tabs). White sidebar. Active state: `color-accent` left border 3px.
- ✅ DONE **M5-06** Frontend: `ReceiptPage.jsx` — job number lookup (scan QR or type). Show job card. "Mark Received" button. Photo upload grid (2 slots minimum, up to 5). Preview before upload.
- ✅ DONE **M5-07** Frontend: `RegisterForCustomerPage.jsx` — same fields as customer form; "Staff Registration" header pill badge; same OTP step.
- ✅ DONE **M5-08** Frontend: `AllJobsPage.jsx` (Counter) — table of all jobs, filter by status, search by job# or customer name. View-only details modal.
- ✅ DONE **M5-09** Commit: "feat: counter receipt, tagging and photos"

---

### MILESTONE 6 — Repairer Dashboard & Pricing

- ✅ DONE **M6-01** `GET /api/repairer/queue` — auth: repairer; returns jobs with `status='In Queue'` and `assigned_repairer IS NULL`, ordered by received_at
- ✅ DONE **M6-02** `POST /api/repairer/jobs/:id/claim` — auth: repairer; atomic UPDATE with WHERE `assigned_repairer IS NULL` (prevent race); set `assigned_repairer`; log event
- ✅ DONE **M6-03** `POST /api/repairer/jobs/:id/price` — auth: repairer (own job); validate price within band (or submit for approval if outside); create `price_versions` record; if in-band: send price SMS to customer and transition to `Awaiting Confirmation`; if out-of-band: create approval request, do NOT notify customer yet
- ✅ DONE **M6-04** `GET /api/repairer/jobs` — auth: repairer; returns own claimed jobs with any status
- ✅ DONE **M6-05** `GET /api/repairer/jobs/:id` — auth: repairer (own job) | owner; full job detail with photos, price versions, payments, audit log
- ✅ DONE **M6-06** `PATCH /api/repairer/jobs/:id/status` — auth: repairer; only `Started→Completed` and `Started→On Hold`; validate via state machine; log event; on Completed: send "shoes ready" SMS
- ✅ DONE **M6-07** `GET /api/repairer/activity` — auth: repairer; own jobs, grouped by status
- ✅ DONE **M6-08** Frontend: `QueuePage.jsx` — job cards in a clean list. Each card: job#, customer first name only, service, received time, price range chip. "Claim" pill button. Optimistic UI on claim.
- ✅ DONE **M6-09** Frontend: `JobDetailPage.jsx` (Repairer) — full job detail. Price proposal form (amount input with range hint, notes). Status update buttons (Completed / On Hold). Completion photo upload. Audit timeline accordion at bottom.
- ✅ DONE **M6-10** Frontend: `MyActivityPage.jsx` — own jobs by status; simple stats (jobs done today, week, revenue proposed).
- ✅ DONE **M6-11** Commit: "feat: repairer dashboard and pricing"

---

### MILESTONE 7 — Price Confirmation (Customer)

- ✅ DONE **M7-01** `GET /api/job/:token/price` — public; return latest price version if status=`Awaiting Confirmation`
- ✅ DONE **M7-02** `POST /api/job/:token/price/confirm` — customer confirms; transition to `Started`; log event; send "work authorized" internal note (no SMS)
- ✅ DONE **M7-03** `POST /api/job/:token/price/decline` — customer declines; transition to `Cancelled`; log event; notify repairer (in-app or owner SMS)
- ✅ DONE **M7-04** On-Hold re-pricing: when repairer puts job On Hold and submits revised price, create new `price_versions` record, send "Revised price" SMS with confirm link; customer must re-confirm
- ✅ DONE **M7-05** Frontend: `PriceConfirmPage.jsx` — show: service, price proposed, price range. Two large buttons: "✓ Confirm — KES 350" and "✗ Decline". Success/declined states. No auth required (token in URL).
- ✅ DONE **M7-06** Commit: "feat: price confirmation flow"

---

### MILESTONE 8 — Payment Ledger

- ✅ DONE **M8-01** `POST /api/counter/payments` — auth: counter_staff|owner; record payment (amount, method, reference, job_id); update job `payment_status`; log event
- ✅ DONE **M8-02** `POST /api/counter/payments/reversal` — auth: owner; record reversal with reason; recalculate `payment_status`; log event
- ✅ DONE **M8-03** `GET /api/counter/jobs/:id/payments` — auth: counter_staff|owner; return payment ledger for job
- ✅ DONE **M8-04** Calculate `payment_status` after each payment: sum(payments) - sum(reversals); if 0 → Unpaid; if 0 < sum < price → Part-paid; if >= price → Paid
- ✅ DONE **M8-05** `POST /api/owner/payments/override` — allow pickup despite unpaid balance; creates approval record; logs override in audit
- ✅ DONE **M8-06** Frontend: `PaymentPage.jsx` (Counter) — job lookup, show amount due (price - paid), payment form (amount, method, reference). Payment history accordion. "Record Payment" button.
- ✅ DONE **M8-07** Commit: "feat: payment ledger"

---

### MILESTONE 9 — OTP Pickup

- ✅ DONE **M9-01** `POST /api/pickup/:jobId/send-code` — auth: repairer|counter_staff|owner; validate `payment_status=Paid`; generate 6-digit crypto OTP; hash and store in `pickup_codes`; send SMS (do NOT send plain code to API response); expires in 24h
- ✅ DONE **M9-02** `POST /api/pickup/:jobId/verify` — auth: repairer|counter_staff; verify OTP (compare hash); increment attempts; lock after 3 fails; if valid: transition to `Picked`; mark code used; log event; send "picked up" SMS
- ✅ DONE **M9-03** `POST /api/pickup/:jobId/request-new-code` — auth: counter_staff|owner; invalidate old code; generate new code; log
- ✅ DONE **M9-04** Never return the plain OTP in any API response. The only path is SMS → customer → verbal to staff. Verify in code review.
- ✅ DONE **M9-05** Frontend: `PickupPage.jsx` (Repairer/Counter) — job number input, OTP entry (6-box), verify button. Attempts remaining display. "Request Override" for lost phone scenario.
- ✅ DONE **M9-06** Frontend: `JobStatusPage.jsx` update — when job is `Completed` and `Paid`, show "Request Pickup Code" button → calls `send-code` → shows "Code sent to your phone" confirmation.
- ✅ DONE **M9-07** Commit: "feat: OTP pickup flow"

---

### MILESTONE 10 — Owner Approvals

- ✅ DONE **M10-01** `GET /api/owner/approvals` — auth: owner; return pending approvals (out-of-band price, pickup override, alternate identifier)
- ✅ DONE **M10-02** `POST /api/owner/approvals/:id/decide` — auth: owner; approve/reject with reason; if price approval: update price_version, notify customer via SMS (price proposed SMS); log event
- ✅ DONE **M10-03** Frontend: `ApprovalsPage.jsx` — list of pending items with type badges. Each row: job#, type, requester, details. Approve/Reject buttons inline. Reason text field before reject.
- ✅ DONE **M10-04** Owner override for pickup without code: `POST /api/owner/pickup-override` — creates approval + performs pickup in one step; logs override prominently
- ✅ DONE **M10-05** Commit: "feat: owner approvals"

---

### MILESTONE 11 — Owner Dashboard & Reports

- ✅ DONE **M11-01** `GET /api/owner/dashboard` — auth: owner; aggregate: total active jobs by status, today's revenue, jobs completed today, jobs ready for pickup, pending approvals count
- ✅ DONE **M11-02** `GET /api/owner/jobs` — auth: owner; paginated, filterable (status, date range, repairer, payment_status), searchable (job#, customer name)
- ✅ DONE **M11-03** `GET /api/owner/reports/daily` — auth: owner; for a given date: jobs received, completed, picked, revenue by service, payment methods breakdown
- ✅ DONE **M11-04** `POST /api/owner/day-close` — auth: owner; record cash expected (computed), cash counted, bank deposit ref, notes; persist to `day_close` table
- ✅ DONE **M11-05** `GET /api/owner/sms-volume` — auth: owner; count of SMS sent per day for last 30 days
- ✅ DONE **M11-06** Frontend: `DashboardPage.jsx` (Owner) — 4 KPI cards (Active Jobs, Today Revenue, Ready Pickup, Pending Approvals). Today's jobs mini-table. Cash reconciliation summary. Quick action shortcuts.
- ✅ DONE **M11-07** Frontend: `ReconciliationPage.jsx` — date picker, show computed expected cash, input counted cash, difference highlighted (green/red), bank deposit ref field, "Close Day" button.
- ✅ DONE **M11-08** Frontend: `JobsPage.jsx` (Owner) — full filterable table. Clicking a row opens full job detail slide-over panel. Status filter chips. Date range picker.
- ✅ DONE **M11-09** Frontend: `ReportsPage.jsx` — daily revenue bar chart (using native SVG or lightweight chart lib). Payment methods donut. SMS volume table. Date range selector.
- ✅ DONE **M11-10** Commit: "feat: owner dashboard and reports"

---

### MILESTONE 12 — Audit Trail

- ✅ DONE **M12-01** `GET /api/owner/audit` — auth: owner; paginated audit log, filterable by job#, actor, event_type, date range
- ✅ DONE **M12-02** `GET /api/owner/jobs/:id/audit` — auth: owner|repairer(own)|counter_staff(own); full timeline for one job
- ✅ DONE **M12-03** Verify immutability: test that `UPDATE job_events` and `DELETE FROM job_events` both raise exceptions
- ✅ DONE **M12-04** Frontend: `AuditPage.jsx` — searchable/filterable audit table. Event type badges. Actor column. Old/new value expandable. Job link column.
- ✅ DONE **M12-05** Commit: "feat: audit trail"

---

### MILESTONE 13 — Security Hardening

- [ ] **M13-01** Confirm `SEC-02`: every route has auth middleware; no route relies on UI to enforce permissions
- [ ] **M13-02** Confirm `SEC-03`: every status change goes through `stateMachine.isValidTransition()`; invalid transitions return 422
- [ ] **M13-03** `SEC-04`: verify job tokens are 32-byte hex (64 chars) from `crypto.randomBytes`; not sequential
- [ ] **M13-04** `SEC-05`: verify pickup OTPs hashed with bcrypt/argon2; rate-limited to 3 attempts
- [ ] **M13-05** `SEC-06`: add HTTPS redirect middleware (trust proxy); confirm CSP headers via helmet
- [ ] **M13-06** `SEC-07`: audit all API responses — no phone numbers in repairer-facing responses; no pickup codes in any response
- [ ] **M13-07** Session auto-logout: frontend detects 401 → clears authStore → redirects to login. Inactivity timer (5 min) on shared device flag in config.
- [ ] **M13-08** Commit: "feat: security hardening"

---

### MILESTONE 14 — Integration & End-to-End Testing

- [ ] **M14-01** Write happy-path E2E scenario test (manual or automated): Registration → Receipt → Claim → Price → Confirm → Complete → Pay → Pickup
- [ ] **M14-02** Test all 13 acceptance criteria from SRS section 10 manually; document results
- [ ] **M14-03** Test race condition: two browser tabs try to claim same job simultaneously
- [ ] **M14-04** Test state machine rejections: try invalid transitions from API directly (not UI)
- [ ] **M14-05** Test audit log immutability (direct SQL + API)
- [ ] **M14-06** Test OTP lockout after 3 wrong attempts
- [ ] **M14-07** Test registration expiry (manually set `expires_at` to past, run cron, verify Expired)
- [ ] **M14-08** Commit: "test: e2e acceptance criteria"

---

### MILESTONE 15 — UI Polish & Responsiveness

- [ ] **M15-01** Audit every page against Design Tokens — no hardcoded hex colors, no inline font sizes
- [ ] **M15-02** Verify all 3 dashboards are fully responsive: mobile (375px), tablet (768px), desktop (1280px)
- [ ] **M15-03** Add loading skeletons (shimmer effect) for all async data fetches
- [ ] **M15-04** Add toast notifications (success, error, info) for all user actions
- [ ] **M15-05** Add empty states with helpful messages (no jobs in queue, no payments, etc.)
- [ ] **M15-06** Add `<title>` and `<meta name="description">` to all pages
- [ ] **M15-07** Add PWA manifest for customer portal (Add to Home Screen on mobile)
- [ ] **M15-08** Commit: "polish: UI responsiveness and empty states"

---

### MILESTONE 16 — Deployment Prep

- [ ] **M16-01** Create `Dockerfile` for backend and frontend
- [ ] **M16-02** Create `docker-compose.yml` (backend, frontend, postgres)
- [ ] **M16-03** Create production `.env` checklist (never commit real .env)
- [ ] **M16-04** Create `README.md` with setup instructions, environment variables, and deployment steps
- [ ] **M16-05** Final commit: "chore: deployment configuration"

---

## 🛠️ Technology Stack (Confirmed)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Backend | Node.js 20 + Express 5 | Familiar, fast, good ecosystem |
| Database | PostgreSQL 16 | ACID, triggers, JSONB for audit |
| Auth | JWT (jsonwebtoken) + bcrypt | Stateless, secure |
| File upload | multer + sharp | Image compression |
| SMS | Configurable (Africa's Talking / Twilio / mock) | Plug-in abstraction |
| Frontend | React 18 + Vite | Fast dev, modern |
| State | Zustand | Lightweight, no boilerplate |
| Routing | React Router v6 | Standard |
| HTTP client | Axios | Interceptors for auth |
| Charts | Recharts (lightweight) | No heavyweight deps |
| Icons | Lucide React | Clean, stroke-only |
| Styling | Plain CSS (design tokens) | Full control, no framework conflicts |

---

## 💰 Service Catalog (Seeded Data)

| Service | Min (KES) | Max (KES) | Fixed? |
|---------|-----------|-----------|--------|
| Basic Cleaning | 200 | 500 | No |
| Deep Cleaning | 250 | 500 | No |
| Shoe Whitening | 500 | 500 | Yes |
| Suede Cleaning | 300 | 300 | Yes |
| Shoe Repair | 500 | 500 | Yes |
| Shoe Restoration | 700 | 700 | Yes |
| Deodorization | 300 | 300 | Yes |
| Stain Removal | 300 | 300 | Yes |
| Other | 0 | any | No |

---

## 📱 SMS Events Reference

| Event | Recipient | Trigger | Content |
|-------|-----------|---------|---------|
| Phone verification | Customer | OTP request | "Your verification code is {code}. Do not share." |
| Job registered | Customer | Job created | "Job #{num} received. Track: {link}" |
| Price proposed | Customer | In-band price approved | "Price for your shoes: KES {amount}. Confirm: {link}" |
| Price reminder | Customer | 72h no response | "Reminder: Please confirm your price for job #{num}: {link}" |
| Revised price (On Hold) | Customer | On Hold + new price | "Update on your shoes: {reason}. New price KES {amount}: {link}" |
| Job completed | Customer | Status→Completed | "Your shoes are ready! Balance due: KES {balance}. {link}" |
| Pickup code | Customer | Code generated | "Your pickup code: {code}. Do not share this code." |
| Abandoned reminder | Customer | Day 20, 25, 30 | "Your shoes are awaiting collection. Job #{num}." |
| Approval request | Owner/approver | Out-of-band price | "Approval needed for job #{num}: KES {amount} (band: {min}–{max}). Approve in dashboard." |

---

## 🔁 Cross-Dashboard Interaction Map

```
Customer Portal          Counter Dashboard         Repairer Dashboard       Owner Dashboard
──────────────           ─────────────────         ──────────────────       ───────────────
Register job     ──────► See job (Registered)
                          Mark Received    ──────► See in Queue
                                                    Claim job
                                                    Propose price   ──────► (if out-of-band)
                                                                             Approve/Reject
                                          ◄──────  Price approved   ──────►
Receive price SMS
Confirm/Decline  ──────────────────────────────────────────────────────────►
                                                                    Job→Started
                                                    Mark Completed  ──────►
Receive "ready" SMS
                          Record payment  ──────────────────────────────────►
Request code     ──────► Send code       ──────────────────────────────────►
Receive OTP via SMS
Tell code to counter      Enter OTP               
                          Verify & Release──────────────────────────────────►
                                                                    Job→Picked in audit
```

---

## ✅ Session Checkpoint Protocol

At the start of every new session:
1. Open this file: `WORKPLAN.md`
2. Scan for the last `✅ DONE` entry
3. Continue from the very next `[ ]` task
4. After completing any task: change `[ ]` to `✅ DONE` and save this file
5. Commit after every milestone

---

*Last updated: 2026-10-14 | Phase 1 — Build in Progress*
