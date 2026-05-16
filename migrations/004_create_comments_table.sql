-- Migration: Add comments table for researcher-triager communication
-- Date: 2026-05-15

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (report_id) REFERENCES reports(id)
);

CREATE INDEX idx_comments_report_id ON comments(report_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);
