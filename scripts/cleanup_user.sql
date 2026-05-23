-- Find user "was dish" data
-- First, let's find all reports assigned to anyone with "dish" in their email/name

-- Check assigned_to field in reports
SELECT id, ref_id, assigned_to, status FROM reports WHERE assigned_to LIKE '%dish%';

-- Check researcher_stats for "was dish"
SELECT * FROM researcher_stats;

-- Check hall_of_fame entries
SELECT * FROM hall_of_fame;

-- Check hacktivity entries
SELECT * FROM hacktivity;

-- Check audit logs for the user
SELECT * FROM audit_logs WHERE actor_email LIKE '%dish%' OR actor_id LIKE '%dish%';
