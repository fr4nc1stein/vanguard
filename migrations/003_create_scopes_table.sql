-- Migration: Create scopes table for dynamic target management
-- Created: 2026-05-15

CREATE TABLE IF NOT EXISTS scopes (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  description TEXT,
  target_type TEXT NOT NULL DEFAULT 'web_app',
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Seed initial scopes (existing hardcoded targets)
INSERT INTO scopes (id, domain, description, target_type, status, created_by, created_at, updated_at)
VALUES
  ('scope_' || lower(hex(randomblob(16))), 'vanguard.laet4x.com', 'Main Vanguard VDP platform', 'web_app', 'active', 'system', unixepoch() * 1000, unixepoch() * 1000),
  ('scope_' || lower(hex(randomblob(16))), 'laet4x.com', 'Company website', 'web_app', 'active', 'system', unixepoch() * 1000, unixepoch() * 1000);
