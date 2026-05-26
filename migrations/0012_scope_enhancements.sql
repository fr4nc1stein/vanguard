-- Migration: Add vuln type restrictions, severity restrictions, notes,
--            exclusion paths, and soft-delete to the scopes table
-- Created: 2026-05-25

ALTER TABLE scopes ADD COLUMN allowed_vuln_types TEXT;      -- JSON array, NULL = all allowed
ALTER TABLE scopes ADD COLUMN severity_restriction TEXT;     -- JSON array, NULL = all allowed
ALTER TABLE scopes ADD COLUMN notes TEXT;                    -- freeform guidance for researchers
ALTER TABLE scopes ADD COLUMN exclusion_paths TEXT;          -- freeform exclusion paths / rules
ALTER TABLE scopes ADD COLUMN deleted_at INTEGER;            -- NULL = active, set = soft-deleted
