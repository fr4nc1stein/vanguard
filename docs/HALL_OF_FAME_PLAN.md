# Hall of Fame Implementation Plan

## Overview
Implement a comprehensive Hall of Fame system with leaderboard, activity feed (Hacktivity), and admin management interface.

## Requirements (Confirmed)
- ✅ Award points to already-accepted reports (backfill)
- ✅ No bounty tracking for now
- ✅ No points for duplicates
- ✅ All-time leaderboard only (no monthly/yearly)
- ✅ No achievement badges for now
- ✅ Add duplicate detection/marking feature

## Database Schema

### Tables Created
1. **points_config** - Admin-configurable points per severity
2. **researcher_stats** - Aggregated stats per researcher
3. **hall_of_fame** - Public recognition entries
4. **hacktivity** - Activity feed entries

### Schema Additions
- **reports.duplicate_of** - Optional field to link duplicate reports to original
- **hall_of_fame.is_public** - Toggle visibility per entry
- Audit logging for all point awards and adjustments

### Default Points
- Critical: 200 points
- High: 150 points
- Medium: 100 points
- Low: 50 points
- Informational: 10 points

## Implementation Phases

### Phase 1: Database & Backend (Current)
- [x] Create migration file
- [x] Update Drizzle schema
- [ ] Run migration on local database
- [ ] Run migration on production database
- [ ] Create backfill script for existing accepted reports

### Phase 2: API Endpoints
- [ ] `GET /api/hall-of-fame` - Public leaderboard (top 100) with avatars
- [ ] `GET /api/hall-of-fame/stats` - Overall statistics (total points, researchers, etc.)
- [ ] `GET /api/hacktivity` - Public activity feed (last 100) with avatars
- [ ] `GET /api/admin/hall-of-fame/leaderboard` - Admin leaderboard view
- [ ] `GET /api/admin/hall-of-fame/settings` - Get points config
- [ ] `PATCH /api/admin/hall-of-fame/settings` - Update points (with audit log)
- [ ] `POST /api/admin/hall-of-fame/award` - Manual point award (with reason)
- [ ] `PATCH /api/admin/hall-of-fame/[id]` - Toggle visibility or edit title

### Phase 3: Auto-Award Logic
- [ ] Create service: `lib/services/hall-of-fame.ts`
- [ ] Function: `awardPoints(reportId, status)` - Check if already awarded
- [ ] Function: `updateResearcherStats(researcherId)` - Aggregate stats
- [ ] Function: `createHacktivityEntry(reportId, action)` - Activity feed
- [ ] Function: `redactReportTitle(title)` - Remove sensitive info
- [ ] Function: `fetchResearcherAvatar(clerkUserId)` - Get from Clerk
- [ ] Integrate with report status update endpoint
- [ ] Trigger on status change to 'accepted' OR 'fixed'
- [ ] Log all point awards in audit_logs table
- [ ] Skip if status is 'duplicate'

### Phase 4: Admin Interface (Simplified Single Page)
- [ ] Create `/admin/hall-of-fame` page
- [ ] **Top Section: Quick Statistics**
  - [ ] Total points awarded
  - [ ] Total researchers recognized
  - [ ] Average points per report
  - [ ] Most active researcher (this month)
- [ ] **Main Section: Leaderboard Table**
  - [ ] Search, sort, filter researchers
  - [ ] Display avatars from Clerk
  - [ ] View detailed stats per researcher
  - [ ] Manual point adjustment (with reason field)
  - [ ] Toggle visibility per entry
- [ ] **Collapsible Section: Points Configuration**
  - [ ] Edit points per severity
  - [ ] View change history from audit logs
  - [ ] Save with confirmation
- [ ] **Recent Activity Feed** (bottom)
  - [ ] Last 20 activities
  - [ ] Filter by severity/researcher
  - [ ] Quick visibility toggle

### Phase 5: Public Page Enhancement
- [ ] Update `/hall-of-fame` page
- [ ] **Hero Section: Top 3 Researchers**
  - [ ] Large cards with avatars (🥇🥈🥉)
  - [ ] Points and report count
  - [ ] Animated on load
- [ ] **Statistics Cards**
  - [ ] Total researchers recognized
  - [ ] Total reports accepted
  - [ ] Total points awarded
  - [ ] Average response time
- [ ] **Leaderboard Component (Top 100)**
  - [ ] Table with avatars from Clerk
  - [ ] Rank, name, points, reports
  - [ ] Breakdown by severity
  - [ ] Search and filter
- [ ] **Hacktivity Feed (Last 100)**
  - [ ] Timeline view with avatars
  - [ ] Redacted titles
  - [ ] Severity badges
  - [ ] Points awarded
  - [ ] Filter by severity
- [ ] **Time Period Filter** (7d, 30d, all-time)
- [ ] Responsive design (mobile-first)

### Phase 3.5: Duplicate Detection (Simplified)
- [ ] Add 'duplicate' status to ReportStatus enum
- [ ] Add optional `duplicate_of` field to reports table (TEXT, nullable)
- [ ] Add "Mark as Duplicate" button in triage UI
- [ ] Modal: Search and select original report by ref ID
- [ ] Update report status to 'duplicate' and set duplicate_of
- [ ] Show duplicate badge in report list
- [ ] Audit log entry: "Marked as duplicate of REF-XXX"
- [ ] No points awarded for duplicates
- [ ] Future: Pattern matching for potential duplicates (v2)

## API Response Formats

### GET /api/hall-of-fame
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "researcherId": "user_xxx",
      "researcherName": "Alice Johnson",
      "avatarUrl": "https://img.clerk.com/...",
      "totalPoints": 1250,
      "acceptedReports": 15,
      "criticalCount": 3,
      "highCount": 5,
      "mediumCount": 7,
      "firstReportAt": 1234567890,
      "lastReportAt": 1234567890
    }
  ],
  "total": 100
}
```

### GET /api/hall-of-fame/stats
```json
{
  "totalPointsAwarded": 12500,
  "totalResearchers": 45,
  "totalReportsAccepted": 120,
  "averagePointsPerReport": 104,
  "topResearcherThisMonth": {
    "name": "Alice Johnson",
    "points": 450
  }
}
```

### GET /api/hacktivity
```json
{
  "activities": [
    {
      "id": "hact_xxx",
      "researcherId": "user_xxx",
      "researcherName": "Alice Johnson",
      "avatarUrl": "https://img.clerk.com/...",
      "title": "SQL Injection in Login Form (redacted)",
      "severity": "critical",
      "points": 200,
      "timestamp": 1234567890,
      "action": "accepted"
    }
  ],
  "total": 100
}
```

## Backfill Strategy

### Script: `scripts/backfill-hall-of-fame.ts`
1. Fetch all reports with status 'accepted' or 'fixed' (exclude 'duplicate')
2. For each report:
   - Get points from points_config based on severity
   - Fetch researcher name and avatar from Clerk
   - Redact report title (remove sensitive info)
   - Create hall_of_fame entry (with redacted title)
   - Update/create researcher_stats (with avatar URL)
   - Create hacktivity entry
   - Log audit entry for point award
3. Log progress and errors
4. Dry-run mode for testing
5. Transaction support (rollback on error)

## Auto-Award Flow

```
Report Status Changed to 'accepted' OR 'fixed'
  ↓
Check if status is 'duplicate' → Skip (no points)
  ↓
Check if already awarded (hall_of_fame.reportId exists)
  ↓ (if not awarded)
Get points from points_config based on severity
  ↓
Fetch researcher name and avatar from Clerk
  ↓
Redact report title (remove sensitive info)
  ↓
Create hall_of_fame entry (with redacted title, avatar)
  ↓
Update researcher_stats (or create if new)
  ↓
Create hacktivity entry (with avatar)
  ↓
Log audit entry: "Points awarded: {points} for {severity} report"
  ↓
Return success with toast notification
```

## Title Redaction Strategy

### Function: `redactReportTitle(title: string): string`
**Rules:**
- Remove email addresses
- Remove IP addresses
- Remove API keys/tokens
- Remove URLs (keep domain only)
- Remove file paths
- Keep vulnerability type and general description

**Examples:**
- `SQL Injection in /api/users/login` → `SQL Injection in Login API`
- `XSS via admin@example.com parameter` → `XSS via Email Parameter`
- `Exposed API key: sk_live_xxx` → `Exposed API Key`

**Admin Override:**
- Admin can manually edit public title in hall_of_fame table
- Original title stays in reports table (encrypted)

## Avatar Handling

### Clerk Integration
- Fetch avatar URL from Clerk user object: `user.imageUrl`
- Cache avatar URLs in researcher_stats table
- Fallback to initials if no avatar
- Update avatar URL when researcher stats are updated

### Privacy
- Researchers can opt-out of public display (future feature)
- Default: Public display enabled

## Duplicate Detection Flow

```
Admin clicks "Mark as Duplicate"
  ↓
Show modal: "Link to original report?"
  ↓
Admin selects original report (search by ref ID)
  ↓
Update report status to 'duplicate'
  ↓
Add audit log entry
  ↓
Show toast: "Marked as duplicate of REF-XXX"
```

## Testing Checklist

### Database
- [ ] Migration runs successfully
- [ ] Default points config inserted
- [ ] Indexes created correctly

### Backend
- [ ] Points awarded correctly based on severity
- [ ] Researcher stats update correctly
- [ ] Hacktivity entries created
- [ ] No duplicate awards for same report

### Admin Interface
- [ ] Leaderboard displays correctly
- [ ] Search/sort/filter works
- [ ] Points configuration updates
- [ ] Manual point adjustment works
- [ ] Activity feed displays

### Public Page
- [ ] Leaderboard shows top 100
- [ ] Hacktivity shows last 100
- [ ] Statistics accurate
- [ ] Responsive on mobile

### Edge Cases
- [ ] New researcher (no stats yet)
- [ ] Report with no researcher (anonymous)
- [ ] Changing severity after award
- [ ] Deleting report with award
- [ ] Multiple status changes
- [ ] Title with sensitive information (redaction)
- [ ] Researcher with no avatar (fallback)
- [ ] Duplicate of duplicate (nested)
- [ ] Manual point adjustment (audit trail)
- [ ] Points config change (affects future only)

## Deployment Steps

1. Run migration on production
2. Run backfill script (dry-run first)
3. Deploy backend changes
4. Deploy frontend changes
5. Verify points awarded correctly
6. Monitor for errors

## Implementation Priority

### Session 1: Core Backend (MVP)
1. Run migration (add tables)
2. Add `duplicate_of` field to reports table
3. Create backfill script with dry-run mode
4. Build auto-award service with title redaction
5. Create public API endpoints (hall-of-fame, hacktivity, stats)
6. Test with existing data

### Session 2: Public Page
1. Enhance `/hall-of-fame` page
2. Add hero section with top 3
3. Add statistics cards
4. Add leaderboard table with avatars
5. Add hacktivity feed with timeline
6. Add filters and search
7. Responsive design

### Session 3: Admin Interface
1. Create `/admin/hall-of-fame` page
2. Add statistics dashboard
3. Add leaderboard management table
4. Add points configuration section
5. Add recent activity feed
6. Add duplicate marking feature in triage

### Session 4: Polish & Deploy
1. Add manual point adjustment
2. Add title editing for admins
3. Add visibility toggles
4. Testing (all edge cases)
5. Deploy to production
6. Monitor and fix issues

## Future Enhancements (Not Now)
- Monthly/Yearly leaderboards
- Achievement badges
- Bounty tracking
- Researcher opt-in/opt-out
- Email notifications
- Advanced duplicate detection (ML-based)
