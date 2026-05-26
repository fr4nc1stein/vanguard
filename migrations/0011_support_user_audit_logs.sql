-- Migration: Support non-report audit log entities
--
-- User-management actions need to write to audit_logs, but report_id is a
-- foreign key to reports.id. This keeps report audit behavior intact while
-- allowing user/system audit entries with report_id = NULL.

PRAGMA foreign_keys = off;

CREATE TABLE audit_logs_new (
  id          TEXT PRIMARY KEY,
  report_id   TEXT,
  entity_type TEXT NOT NULL DEFAULT 'report',
  entity_id   TEXT,
  actor_id    TEXT NOT NULL,
  actor_email TEXT,
  action      TEXT NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  ip_hash     TEXT,
  is_internal INTEGER NOT NULL DEFAULT 0,
  timestamp   INTEGER NOT NULL,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

INSERT INTO audit_logs_new (
  id,
  report_id,
  entity_type,
  entity_id,
  actor_id,
  actor_email,
  action,
  old_value,
  new_value,
  ip_hash,
  is_internal,
  timestamp
)
SELECT
  id,
  CASE
    WHEN report_id = 'system' THEN NULL
    WHEN report_id LIKE 'user_%' THEN NULL
    ELSE report_id
  END AS report_id,
  CASE
    WHEN report_id = 'system' THEN 'system'
    WHEN report_id LIKE 'user_%' THEN 'user'
    ELSE 'report'
  END AS entity_type,
  CASE
    WHEN report_id IS NULL THEN NULL
    ELSE report_id
  END AS entity_id,
  actor_id,
  actor_email,
  action,
  old_value,
  new_value,
  ip_hash,
  is_internal,
  timestamp
FROM audit_logs;

DROP TABLE audit_logs;
ALTER TABLE audit_logs_new RENAME TO audit_logs;

CREATE INDEX IF NOT EXISTS idx_audit_report_id ON audit_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

PRAGMA foreign_keys = on;
