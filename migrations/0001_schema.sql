-- Vanguard VDP — Initial Schema
-- Apply with: wrangler d1 execute vanguard-security --file=migrations/0001_schema.sql
-- For local dev: wrangler d1 execute vanguard-security --local --file=migrations/0001_schema.sql

-- ── Reports ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id               TEXT PRIMARY KEY,           -- UUIDv4
  ref_id           TEXT NOT NULL UNIQUE,        -- VDP-YYYY-XXXX (public reference)
  handle           TEXT,                        -- researcher's handle (optional)
  email_encrypted  TEXT,                        -- AES-GCM encrypted email
  email_iv         TEXT,                        -- IV for email decryption
  target           TEXT NOT NULL,               -- affected platform
  vuln_type        TEXT NOT NULL,               -- vulnerability category
  severity         TEXT NOT NULL CHECK (severity IN ('Critical','High','Medium','Low','Info')),
  title            TEXT NOT NULL,               -- report title (plaintext)
  body_encrypted   TEXT NOT NULL,               -- AES-GCM encrypted: description + steps + impact
  body_iv          TEXT NOT NULL,               -- IV for body decryption
  cvss             TEXT,                        -- CVSS string (optional)
  status           TEXT NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new','triaged','accepted','rejected','fixed','informational')),
  assigned_to      TEXT,                        -- Clerk user ID of triager
  poc_files        TEXT NOT NULL DEFAULT '[]',  -- JSON array of R2 object keys
  clerk_user_id    TEXT,                        -- Clerk user ID (null = anonymous)
  ip_hash          TEXT,                        -- SHA-256 of submitter IP (privacy-preserving)
  submitted_at     INTEGER NOT NULL,            -- Unix timestamp (ms)
  updated_at       INTEGER NOT NULL             -- Unix timestamp (ms)
);

CREATE INDEX IF NOT EXISTS idx_reports_status    ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_severity  ON reports(severity);
CREATE INDEX IF NOT EXISTS idx_reports_target    ON reports(target);
CREATE INDEX IF NOT EXISTS idx_reports_clerk_uid ON reports(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_submitted ON reports(submitted_at DESC);

-- ── Audit Logs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,        -- UUIDv4
  report_id   TEXT NOT NULL,           -- FK → reports.id
  actor_id    TEXT NOT NULL,           -- Clerk user ID or 'anonymous'
  actor_email TEXT,                    -- for display in admin UI (non-sensitive)
  action      TEXT NOT NULL,           -- e.g. 'status_change', 'assigned', 'comment'
  old_value   TEXT,                    -- previous value
  new_value   TEXT,                    -- new value
  ip_hash     TEXT,                    -- SHA-256 of actor IP
  timestamp   INTEGER NOT NULL,        -- Unix timestamp (ms)
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_report_id ON audit_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp  ON audit_logs(timestamp DESC);
