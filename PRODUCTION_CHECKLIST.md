# Production Deployment & Security Checklist

This document must be reviewed and signed off prior to launching the Shoe Repair Job Tracking & Revenue Control System in a live production environment.

---

## 1. Secrets & Environment Configuration

- [ ] **JWT Secret Key**: Generate a 64-character cryptographic random hex string:
  ```bash
  openssl rand -hex 32
  ```
  Ensure this value is configured as `JWT_SECRET` in production `.env` and never exposed or committed.
- [ ] **Database Password**: Set a strong, randomly generated database password (min 16 characters) for `DB_PASSWORD`.
- [ ] **Africa's Talking SMS Credentials**:
  - Set `SMS_MODE=live`.
  - Provide valid `AT_USERNAME` and production `AT_API_KEY`.
  - Set custom alphanumeric `AT_SENDER_ID` once approved by telco regulators (e.g. CAK in Kenya).
- [ ] **Environment Mode**: Ensure `NODE_ENV=production` is set across all services. In production:
  - Express suppresses stack traces in API error responses.
  - Helmet enforces strict Content Security Policy (CSP).
  - Morgan switches to Apache-style combined access logs.
- [ ] **Origin & Base URLs**:
  - `APP_BASE_URL`: Set to the fully qualified domain (e.g., `https://repair.safikicks.co.ke`). This is used when generating tracking and price confirmation links dispatched via SMS.
  - `CORS_ORIGIN`: Match the exact public domain of the application.

---

## 2. Default Seed Account Password Rotation

> [!CAUTION]
> The default development passwords MUST be changed immediately upon first deployment!

- [ ] **Rotate Owner Password**:
  1. Log into the Owner Dashboard using `owner@safikicks.co.ke` / `ChangeMe123!`.
  2. Navigate to **Staff Management**.
  3. Reset the owner password or execute an updated bcrypt hash directly in PostgreSQL:
     ```bash
     node -e "console.log(require('bcrypt').hashSync('YourNewStrongPassword', 12))"
     ```
- [ ] **Verify Staff Accounts**:
  - Update `grace@safikicks.co.ke` (Counter Staff) password.
  - Update `joseph@safikicks.co.ke` (Repairer) password.
  - Deactivate any unused demo accounts (`repairer2@safikicks.co.ke`).

---

## 3. Database Integrity & Persistence

- [ ] **Persistent Storage**: Ensure Docker volume `postgres_data` is mounted to high-durability storage (SSD / EBS / persistent block volume).
- [ ] **Audit Trail Immutability**: Run `backend/test_immutability.sql` or test directly in `psql` to verify that `UPDATE` and `DELETE` on `job_events` are strictly rejected by PostgreSQL triggers.
- [ ] **Automated Backups**: Configure a daily cron job to run `pg_dump`:
  ```bash
  0 2 * * * docker exec -t kelvin_postgres pg_dump -U postgres kelvin_shoe_repair | gzip > /backups/safikicks_$(date +\%F).sql.gz
  ```
- [ ] **Retention Policy**: Retain daily database dumps for at least 30 days and monthly backups for 1 year offsite (e.g. AWS S3 or GCP Cloud Storage).

---

## 4. Reverse Proxy, HTTPS & SSL

- [ ] **TLS Termination**: Route all traffic through HTTPS (Port 443).
- [ ] **SSL Certificates**: Issue Let's Encrypt certificates using Certbot or utilize Cloudflare SSL/TLS proxying.
- [ ] **HSTS**: Verify `Strict-Transport-Security` header is active (enforced automatically by Helmet in production).
- [ ] **Upload Size Limits**: Ensure reverse proxies (Nginx / Cloudflare) permit at least 12MB client request body (`client_max_body_size 12M;`) to allow high-resolution photo uploads.

---

## 5. File Storage & Photo Processing

- [ ] **Upload Directory Ownership**: Confirm that `/app/uploads` has proper permissions (`chown -R node:node /app/uploads`).
- [ ] **Sharp Compression**: Verify Sharp library compresses uploaded photos to WebP format, max dimension 1200px, 80% quality.
- [ ] **Volume Mounts**: In Docker, ensure `uploads_data` volume is backed up alongside database dumps so customer and repair photos are retained permanently.

---

## 6. Shared Terminal Security

- [ ] **Auto-Logout**: Confirm that shared counter staff and repairer terminals automatically log out users after 5 minutes of inactivity (`useInactivityLogout.js`).
- [ ] **Session Destruction**: Verify that logging out immediately flushes local state and invalidates the client session token.
- [ ] **Pickup OTP Secrecy**: Verify that 6-digit pickup OTPs are never rendered in browser network tools, staff screens, or public logs. OTPs must only travel via SMS to customer phones.
