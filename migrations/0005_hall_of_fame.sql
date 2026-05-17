-- Hall of Fame System Migration
-- Creates tables for leaderboard, activity feed, and points configuration

-- Points Configuration (Admin-managed)
CREATE TABLE IF NOT EXISTS points_config (
  id TEXT PRIMARY KEY,
  severity TEXT NOT NULL UNIQUE, -- 'critical', 'high', 'medium', 'low', 'informational'
  points INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL -- Clerk user ID
);

-- Insert default points configuration
INSERT INTO points_config (id, severity, points, updated_at, updated_by) VALUES
  ('pc_critical', 'critical', 200, strftime('%s', 'now') * 1000, 'system'),
  ('pc_high', 'high', 150, strftime('%s', 'now') * 1000, 'system'),
  ('pc_medium', 'medium', 100, strftime('%s', 'now') * 1000, 'system'),
  ('pc_low', 'low', 50, strftime('%s', 'now') * 1000, 'system'),
  ('pc_info', 'informational', 10, strftime('%s', 'now') * 1000, 'system');

-- Researcher Stats (Auto-calculated)
CREATE TABLE IF NOT EXISTS researcher_stats (
  researcher_id TEXT PRIMARY KEY, -- Clerk user ID
  researcher_name TEXT NOT NULL, -- Display name from Clerk
  total_points INTEGER DEFAULT 0,
  total_reports INTEGER DEFAULT 0,
  accepted_reports INTEGER DEFAULT 0,
  critical_count INTEGER DEFAULT 0,
  high_count INTEGER DEFAULT 0,
  medium_count INTEGER DEFAULT 0,
  low_count INTEGER DEFAULT 0,
  info_count INTEGER DEFAULT 0,
  first_report_at INTEGER,
  last_report_at INTEGER,
  updated_at INTEGER NOT NULL
);

-- Hall of Fame Entries (Public recognition)
CREATE TABLE IF NOT EXISTS hall_of_fame (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL UNIQUE, -- One entry per report
  researcher_id TEXT NOT NULL,
  researcher_name TEXT NOT NULL,
  title TEXT NOT NULL, -- Redacted report title
  severity TEXT NOT NULL,
  points_awarded INTEGER NOT NULL,
  accepted_at INTEGER NOT NULL,
  is_public INTEGER DEFAULT 1, -- 1 = visible, 0 = hidden
  created_at INTEGER NOT NULL,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Activity Feed (Hacktivity)
CREATE TABLE IF NOT EXISTS hacktivity (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  researcher_id TEXT NOT NULL,
  researcher_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'accepted', 'resolved', 'points_awarded'
  title TEXT NOT NULL, -- Redacted title
  severity TEXT NOT NULL,
  points INTEGER,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_researcher_stats_points ON researcher_stats(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_hall_of_fame_researcher ON hall_of_fame(researcher_id);
CREATE INDEX IF NOT EXISTS idx_hall_of_fame_accepted_at ON hall_of_fame(accepted_at DESC);
CREATE INDEX IF NOT EXISTS idx_hall_of_fame_public ON hall_of_fame(is_public);
CREATE INDEX IF NOT EXISTS idx_hacktivity_timestamp ON hacktivity(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_hacktivity_researcher ON hacktivity(researcher_id);
