-- ============================================================================
-- Migration: Add title_disclosed to hacktivity table
-- ============================================================================
-- This migration adds a title_disclosed column to control whether report
-- titles are visible or blurred in the public hacktivity feed.
--
-- Run on production:
-- npx wrangler d1 execute vanguard-security --remote --file=migrations/0008_add_title_disclosed.sql
-- ============================================================================

-- Add title_disclosed column (default 0 = blurred)
ALTER TABLE hacktivity ADD COLUMN title_disclosed INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- Verification
-- ============================================================================

-- Check table structure
SELECT sql FROM sqlite_master WHERE type='table' AND name='hacktivity';

-- Verify column was added
PRAGMA table_info(hacktivity);

-- Check existing records (should all have title_disclosed = 0)
SELECT id, report_id, title_disclosed FROM hacktivity LIMIT 10;
