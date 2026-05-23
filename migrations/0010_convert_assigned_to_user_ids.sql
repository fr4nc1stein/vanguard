-- ============================================================================
-- Migration: Convert assigned_to from emails to Clerk user IDs
-- ============================================================================
-- This migration converts the assigned_to field from storing email addresses
-- to storing Clerk user IDs for better privacy and consistency.
--
-- IMPORTANT: This migration requires manual intervention to map emails to user IDs
-- You need to fetch the mapping from Clerk and update the records accordingly.
--
-- Run on production:
-- npx wrangler d1 execute vanguard-security --remote --file=migrations/0010_convert_assigned_to_user_ids.sql
-- ============================================================================

-- Step 1: Check current assigned_to values (emails)
SELECT DISTINCT assigned_to FROM reports WHERE assigned_to IS NOT NULL;

-- Step 2: Manual mapping required
-- You need to:
-- 1. Get the list of emails from above
-- 2. Look up each email in Clerk to get the user_id
-- 3. Run UPDATE statements to convert each email to user_id
--
-- Example (replace with actual values):
-- UPDATE reports SET assigned_to = 'user_2abc123xyz' WHERE assigned_to = 'john.doe@example.com';
-- UPDATE reports SET assigned_to = 'user_2def456uvw' WHERE assigned_to = 'jane.smith@example.com';

-- Step 3: Verify conversion
SELECT id, ref_id, assigned_to, status FROM reports WHERE assigned_to IS NOT NULL;

-- ============================================================================
-- Notes:
-- - After running this migration, assigned_to will contain Clerk user IDs
-- - The application code has been updated to handle user IDs
-- - Names will be fetched dynamically from Clerk when displaying
-- ============================================================================
