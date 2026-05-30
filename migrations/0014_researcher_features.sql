-- Report drafts: one active draft per user (upsert pattern)
CREATE TABLE IF NOT EXISTS report_drafts (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT NOT NULL UNIQUE,
  data TEXT NOT NULL,
  data_iv TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_report_drafts_user ON report_drafts(clerk_user_id);

-- Hall of Fame opt-out preference on researcher_stats
ALTER TABLE researcher_stats ADD COLUMN hof_opt_out INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_researcher_stats_hof_opt_out ON researcher_stats(hof_opt_out);
