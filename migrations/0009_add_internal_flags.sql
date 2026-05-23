-- ============================================================================
-- Migration: Add internal flags to comments and audit_logs
-- ============================================================================
-- This migration adds isInternal flags to control visibility of comments
-- and audit logs. Internal items are only visible to triagers and admins.
--
-- Run on production:
-- npx wrangler d1 execute vanguard-security --remote --file=migrations/0009_add_internal_flags.sql
-- ============================================================================

-- Add is_internal column to comments (default 0 = public)
ALTER TABLE comments ADD COLUMN is_internal INTEGER NOT NULL DEFAULT 0;

-- Add is_internal column to audit_logs (default 0 = public)
ALTER TABLE audit_logs ADD COLUMN is_internal INTEGER NOT NULL DEFAULT 0;

-- Mark existing 'assigned' and 'severity_changed' audit logs as internal
UPDATE audit_logs SET is_internal = 1 WHERE action IN ('assigned', 'severity_changed');

-- ============================================================================
-- Verification
-- ============================================================================

-- Check table structures
SELECT sql FROM sqlite_master WHERE type='table' AND name='comments';
SELECT sql FROM sqlite_master WHERE type='table' AND name='audit_logs';

-- Verify columns were added
PRAGMA table_info(comments);
PRAGMA table_info(audit_logs);

-- Check internal audit logs
SELECT id, action, is_internal FROM audit_logs WHERE is_internal = 1 LIMIT 10;

-- Check all comments (should all be public initially)
SELECT id, is_internal FROM comments LIMIT 10;
