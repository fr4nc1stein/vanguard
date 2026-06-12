-- Migration 0015: Triage workflow enhancements
-- Adds: labels, report_labels junction, saved_filters

CREATE TABLE IF NOT EXISTS labels (
  id         TEXT    PRIMARY KEY,
  name       TEXT    NOT NULL,
  color      TEXT    NOT NULL DEFAULT '#6b7280',
  created_by TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS report_labels (
  report_id  TEXT    NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  label_id   TEXT    NOT NULL REFERENCES labels(id)  ON DELETE CASCADE,
  added_by   TEXT    NOT NULL,
  added_at   INTEGER NOT NULL,
  PRIMARY KEY (report_id, label_id)
);

CREATE TABLE IF NOT EXISTS saved_filters (
  id          TEXT    PRIMARY KEY,
  user_id     TEXT    NOT NULL,
  name        TEXT    NOT NULL,
  filter_json TEXT    NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_report_labels_report_id ON report_labels(report_id);
CREATE INDEX IF NOT EXISTS idx_report_labels_label_id  ON report_labels(label_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_user_id   ON saved_filters(user_id);
