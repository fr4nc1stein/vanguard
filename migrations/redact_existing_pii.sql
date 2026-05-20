-- ============================================================================
-- Redact PII from Existing Reports and Comments
-- ============================================================================
-- This script redacts personally identifiable information from existing data
-- that was submitted before the auto-redaction feature was implemented.
--
-- Run this on production D1 database:
-- npx wrangler d1 execute vanguard-security --remote --file=migrations/redact_existing_pii.sql
-- ============================================================================

-- Note: D1/SQLite doesn't support regex_replace, so we need to handle this
-- in the application layer. This script documents what needs to be done.

-- The redaction patterns we need to apply:
-- 1. Email addresses: [A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}
-- 2. IPv4 addresses: (\d{1,3}\.){3}\d{1,3}
-- 3. IPv6 addresses: ([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}
-- 4. API keys/tokens: (api[_-]?key|token|secret|password)[\s:]*[A-Za-z0-9_\-]{16,}
-- 5. Common credentials: (sk|pk|api)_(live|test)_[A-Za-z0-9]{20,}

-- Since SQLite doesn't have built-in regex replace, we need to:
-- 1. Export the data
-- 2. Process it with the redactPII function
-- 3. Update the records

-- This will be handled by a Node.js script instead of pure SQL
-- See: scripts/redact_existing_data.ts

-- Verification query to check for potential PII in titles:
SELECT 
  id,
  ref_id,
  title,
  CASE 
    WHEN title LIKE '%@%' THEN 'Contains @'
    WHEN title LIKE '%.%.%.%' THEN 'Contains IP pattern'
    ELSE 'OK'
  END as potential_pii
FROM reports
WHERE 
  title LIKE '%@%' 
  OR title LIKE '%.%.%.%'
  OR title LIKE '%api%key%'
  OR title LIKE '%token%'
  OR title LIKE '%password%';

-- Verification query for comments:
SELECT 
  id,
  report_id,
  message,
  CASE 
    WHEN message LIKE '%@%' THEN 'Contains @'
    WHEN message LIKE '%.%.%.%' THEN 'Contains IP pattern'
    ELSE 'OK'
  END as potential_pii
FROM comments
WHERE 
  message LIKE '%@%' 
  OR message LIKE '%.%.%.%'
  OR message LIKE '%api%key%'
  OR message LIKE '%token%'
  OR message LIKE '%password%';
