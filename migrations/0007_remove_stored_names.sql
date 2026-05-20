-- ============================================================================
-- Migration: Remove Stored Names, Use Clerk User IDs
-- ============================================================================
-- This migration removes redundant name columns from comments, researcher_stats,
-- hall_of_fame, and hacktivity tables. Names will be fetched dynamically from
-- Clerk using clerk_user_id, ensuring names are always current.
--
-- Run on production:
-- npx wrangler d1 execute vanguard-security --remote --file=migrations/0007_remove_stored_names.sql
-- ============================================================================

-- Note: SQLite doesn't support DROP COLUMN directly, so we need to:
-- 1. Create new tables without name columns
-- 2. Copy data
-- 3. Drop old tables
-- 4. Rename new tables

-- ── 1. Comments Table ────────────────────────────────────────────────────────
CREATE TABLE comments_new (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_role TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

INSERT INTO comments_new (id, report_id, author_id, author_role, message, created_at)
SELECT id, report_id, author_id, author_role, message, created_at
FROM comments;

DROP TABLE comments;
ALTER TABLE comments_new RENAME TO comments;

-- ── 2. Researcher Stats Table ────────────────────────────────────────────────
CREATE TABLE researcher_stats_new (
  researcher_id TEXT PRIMARY KEY,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_reports INTEGER NOT NULL DEFAULT 0,
  accepted_reports INTEGER NOT NULL DEFAULT 0,
  critical_count INTEGER NOT NULL DEFAULT 0,
  high_count INTEGER NOT NULL DEFAULT 0,
  medium_count INTEGER NOT NULL DEFAULT 0,
  low_count INTEGER NOT NULL DEFAULT 0,
  info_count INTEGER NOT NULL DEFAULT 0,
  first_report_at INTEGER,
  last_report_at INTEGER,
  updated_at INTEGER NOT NULL
);

INSERT INTO researcher_stats_new (
  researcher_id, total_points, total_reports, accepted_reports,
  critical_count, high_count, medium_count, low_count, info_count,
  first_report_at, last_report_at, updated_at
)
SELECT 
  researcher_id, total_points, total_reports, accepted_reports,
  critical_count, high_count, medium_count, low_count, info_count,
  first_report_at, last_report_at, updated_at
FROM researcher_stats;

DROP TABLE researcher_stats;
ALTER TABLE researcher_stats_new RENAME TO researcher_stats;

-- ── 3. Hall of Fame Table ────────────────────────────────────────────────────
CREATE TABLE hall_of_fame_new (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL UNIQUE,
  researcher_id TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  points_awarded INTEGER NOT NULL,
  accepted_at INTEGER NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

INSERT INTO hall_of_fame_new (
  id, report_id, researcher_id, title, severity,
  points_awarded, accepted_at, is_public, created_at
)
SELECT 
  id, report_id, researcher_id, title, severity,
  points_awarded, accepted_at, is_public, created_at
FROM hall_of_fame;

DROP TABLE hall_of_fame;
ALTER TABLE hall_of_fame_new RENAME TO hall_of_fame;

-- ── 4. Hacktivity Table ──────────────────────────────────────────────────────
CREATE TABLE hacktivity_new (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  researcher_id TEXT NOT NULL,
  action TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  points INTEGER,
  timestamp INTEGER NOT NULL
);

INSERT INTO hacktivity_new (
  id, report_id, researcher_id, action, title,
  severity, points, timestamp
)
SELECT 
  id, report_id, researcher_id, action, title,
  severity, points, timestamp
FROM hacktivity;

DROP TABLE hacktivity;
ALTER TABLE hacktivity_new RENAME TO hacktivity;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check comments structure
SELECT sql FROM sqlite_master WHERE type='table' AND name='comments';

-- Check researcher_stats structure
SELECT sql FROM sqlite_master WHERE type='table' AND name='researcher_stats';

-- Check hall_of_fame structure
SELECT sql FROM sqlite_master WHERE type='table' AND name='hall_of_fame';

-- Check hacktivity structure
SELECT sql FROM sqlite_master WHERE type='table' AND name='hacktivity';

-- Verify data counts match
SELECT 'comments' as table_name, COUNT(*) as count FROM comments
UNION ALL
SELECT 'researcher_stats', COUNT(*) FROM researcher_stats
UNION ALL
SELECT 'hall_of_fame', COUNT(*) FROM hall_of_fame
UNION ALL
SELECT 'hacktivity', COUNT(*) FROM hacktivity;
