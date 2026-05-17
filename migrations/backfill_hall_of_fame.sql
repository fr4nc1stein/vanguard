-- Backfill Hall of Fame for existing accepted/fixed reports
-- This script awards points to reports that were accepted before the Hall of Fame feature was deployed

-- Insert hall_of_fame entries for accepted/fixed reports that don't have entries yet
INSERT INTO hall_of_fame (id, report_id, researcher_id, researcher_name, title, severity, points_awarded, accepted_at, is_public, created_at)
SELECT 
  'hof_' || substr(r.id, 1, 8) || '_' || substr(hex(randomblob(4)), 1, 8) as id,
  r.id as report_id,
  COALESCE(r.clerk_user_id, 'anonymous') as researcher_id,
  'Researcher' as researcher_name,  -- Will be updated when researcher gets more points
  r.title as title,  -- Using original title (will be redacted in display)
  LOWER(r.severity) as severity,
  CASE LOWER(r.severity)
    WHEN 'critical' THEN 200
    WHEN 'high' THEN 150
    WHEN 'medium' THEN 100
    WHEN 'low' THEN 50
    WHEN 'informational' THEN 10
    ELSE 0
  END as points_awarded,
  r.updated_at as accepted_at,
  1 as is_public,
  strftime('%s', 'now') * 1000 as created_at
FROM reports r
WHERE r.status IN ('accepted', 'fixed')
  AND r.status != 'duplicate'
  AND r.id NOT IN (SELECT report_id FROM hall_of_fame);

-- Create or update researcher_stats for each researcher
INSERT OR REPLACE INTO researcher_stats (
  researcher_id,
  researcher_name,
  total_points,
  total_reports,
  accepted_reports,
  critical_count,
  high_count,
  medium_count,
  low_count,
  info_count,
  first_report_at,
  last_report_at,
  updated_at
)
SELECT 
  COALESCE(r.clerk_user_id, 'anonymous') as researcher_id,
  'Researcher' as researcher_name,
  SUM(CASE LOWER(r.severity)
    WHEN 'critical' THEN 200
    WHEN 'high' THEN 150
    WHEN 'medium' THEN 100
    WHEN 'low' THEN 50
    WHEN 'informational' THEN 10
    ELSE 0
  END) as total_points,
  COUNT(*) as total_reports,
  COUNT(CASE WHEN r.status IN ('accepted', 'fixed') THEN 1 END) as accepted_reports,
  COUNT(CASE WHEN LOWER(r.severity) = 'critical' AND r.status IN ('accepted', 'fixed') THEN 1 END) as critical_count,
  COUNT(CASE WHEN LOWER(r.severity) = 'high' AND r.status IN ('accepted', 'fixed') THEN 1 END) as high_count,
  COUNT(CASE WHEN LOWER(r.severity) = 'medium' AND r.status IN ('accepted', 'fixed') THEN 1 END) as medium_count,
  COUNT(CASE WHEN LOWER(r.severity) = 'low' AND r.status IN ('accepted', 'fixed') THEN 1 END) as low_count,
  COUNT(CASE WHEN LOWER(r.severity) = 'informational' AND r.status IN ('accepted', 'fixed') THEN 1 END) as info_count,
  MIN(r.submitted_at) as first_report_at,
  MAX(r.submitted_at) as last_report_at,
  strftime('%s', 'now') * 1000 as updated_at
FROM reports r
WHERE r.clerk_user_id IS NOT NULL
GROUP BY r.clerk_user_id;

-- Create hacktivity entries for accepted/fixed reports
INSERT INTO hacktivity (id, report_id, researcher_id, researcher_name, action, title, severity, points, timestamp)
SELECT 
  'hact_' || substr(r.id, 1, 8) || '_' || substr(hex(randomblob(4)), 1, 8) as id,
  r.id as report_id,
  COALESCE(r.clerk_user_id, 'anonymous') as researcher_id,
  'Researcher' as researcher_name,
  CASE r.status WHEN 'fixed' THEN 'resolved' ELSE 'accepted' END as action,
  r.title as title,
  LOWER(r.severity) as severity,
  CASE LOWER(r.severity)
    WHEN 'critical' THEN 200
    WHEN 'high' THEN 150
    WHEN 'medium' THEN 100
    WHEN 'low' THEN 50
    WHEN 'informational' THEN 10
    ELSE 0
  END as points,
  r.updated_at as timestamp
FROM reports r
WHERE r.status IN ('accepted', 'fixed')
  AND r.status != 'duplicate'
  AND r.id NOT IN (SELECT report_id FROM hacktivity);

-- Log audit entries for backfilled points
INSERT INTO audit_logs (id, report_id, actor_id, actor_email, action, old_value, new_value, ip_hash, timestamp)
SELECT 
  'audit_' || substr(r.id, 1, 8) || '_' || substr(hex(randomblob(4)), 1, 8) as id,
  r.id as report_id,
  'system' as actor_id,
  NULL as actor_email,
  'points_awarded_backfill' as action,
  NULL as old_value,
  CASE LOWER(r.severity)
    WHEN 'critical' THEN '200 points for critical report (backfill)'
    WHEN 'high' THEN '150 points for high report (backfill)'
    WHEN 'medium' THEN '100 points for medium report (backfill)'
    WHEN 'low' THEN '50 points for low report (backfill)'
    WHEN 'informational' THEN '10 points for informational report (backfill)'
    ELSE '0 points (backfill)'
  END as new_value,
  NULL as ip_hash,
  strftime('%s', 'now') * 1000 as timestamp
FROM reports r
WHERE r.status IN ('accepted', 'fixed')
  AND r.status != 'duplicate'
  AND r.id NOT IN (
    SELECT report_id FROM audit_logs WHERE action = 'points_awarded_backfill'
  );
