-- Migration: Response Templates
-- Created: 2026-05-18
-- Purpose: Add response_templates table for reusable triage communication templates

CREATE TABLE IF NOT EXISTS response_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('triage', 'acceptance', 'rejection', 'info_request', 'general')),
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT,
  is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON response_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_active ON response_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON response_templates(created_at DESC);

-- Seed default templates
INSERT INTO response_templates (id, name, category, subject, body, variables, is_active, created_by, created_at, updated_at) VALUES
(
  'tpl_duplicate_001',
  'Duplicate Report',
  'triage',
  'Report Marked as Duplicate',
  'Thank you for your submission, {{reporter_name}}. This issue has already been reported and is being tracked. We appreciate your effort in helping us improve security!

If you believe this is not a duplicate, please provide additional details that distinguish your finding.',
  '["reporter_name", "ref_id", "title", "severity"]',
  1,
  'system',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
),
(
  'tpl_out_of_scope_001',
  'Out of Scope',
  'rejection',
  'Report Out of Scope',
  'Thank you for your report, {{reporter_name}}. Unfortunately, {{target}} is currently out of scope for our vulnerability disclosure program.

Please refer to our security policy at /policy for the list of in-scope targets and guidelines.',
  '["reporter_name", "target", "ref_id"]',
  1,
  'system',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
),
(
  'tpl_need_info_001',
  'Need More Information',
  'info_request',
  'Additional Information Required',
  'Hi {{reporter_name}}, thank you for reporting {{ref_id}}.

To better understand and validate this issue, could you please provide:
- Detailed steps to reproduce the vulnerability
- Screenshots or proof-of-concept code
- Any additional context that would help us verify the issue

This will help us properly assess and address the vulnerability. Thank you for your patience!',
  '["reporter_name", "ref_id", "title", "severity"]',
  1,
  'system',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
),
(
  'tpl_accepted_001',
  'Accepted - Thank You',
  'acceptance',
  'Vulnerability Confirmed',
  'Great work, {{reporter_name}}! 

We''ve validated {{ref_id}} and confirmed it as a valid {{severity}} severity issue affecting {{target}}. Our development team has been notified and is working on a fix.

We''ll keep you updated on the progress. Thank you for helping us improve our security posture!',
  '["reporter_name", "ref_id", "severity", "target", "title"]',
  1,
  'system',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
),
(
  'tpl_cannot_reproduce_001',
  'Cannot Reproduce',
  'rejection',
  'Unable to Reproduce Issue',
  'Thank you for your submission, {{reporter_name}}.

We''ve attempted to reproduce the issue described in {{ref_id}}, but were unable to verify the vulnerability with the information provided.

If you have additional details, updated steps to reproduce, or can provide more context, please share them and we''ll be happy to re-evaluate. We appreciate your contribution!',
  '["reporter_name", "ref_id", "title"]',
  1,
  'system',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);
