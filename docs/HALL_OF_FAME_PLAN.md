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
- [ ] `GET /api/hall-of-fame` - Public leaderboard (top 100)
- [ ] `GET /api/hacktivity` - Public activity feed (last 100)
- [ ] `GET /api/admin/hall-of-fame/leaderboard` - Admin leaderboard view
- [ ] `GET /api/admin/hall-of-fame/settings` - Get points config
- [ ] `PATCH /api/admin/hall-of-fame/settings` - Update points
- [ ] `POST /api/admin/hall-of-fame/award` - Manual point award
- [ ] `PATCH /api/admin/hall-of-fame/[id]` - Toggle visibility

### Phase 3: Auto-Award Logic
- [ ] Create service: `lib/services/hall-of-fame.ts`
- [ ] Function: `awardPoints(reportId, status)`
- [ ] Function: `updateResearcherStats(researcherId)`
- [ ] Function: `createHacktivityEntry(reportId, action)`
- [ ] Integrate with report status update endpoint
- [ ] Trigger on status change to 'accepted'

### Phase 4: Admin Interface
- [ ] Create `/admin/hall-of-fame` page
- [ ] Tab 1: Leaderboard management
  - [ ] Search, sort, filter researchers
  - [ ] View detailed stats
  - [ ] Manual point adjustment
- [ ] Tab 2: Activity feed management
  - [ ] View recent activity
  - [ ] Toggle public visibility
  - [ ] Filter by severity/researcher
- [ ] Tab 3: Points configuration
  - [ ] Edit points per severity
  - [ ] View change history
  - [ ] Export settings

### Phase 5: Public Page Enhancement
- [ ] Update `/hall-of-fame` page
- [ ] Add leaderboard component (top 100)
- [ ] Add hacktivity feed (last 100)
- [ ] Add statistics cards
- [ ] Add time period filter (7d, 30d, all-time)
- [ ] Responsive design

### Phase 6: Duplicate Detection
- [ ] Add 'duplicate' status to reports
- [ ] Create duplicate detection API
- [ ] Add "Mark as Duplicate" button in triage
- [ ] Link duplicate to original report
- [ ] Show duplicate warning in UI

## API Response Formats

### GET /api/hall-of-fame
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "researcherId": "user_xxx",
      "researcherName": "Alice Johnson",
      "totalPoints": 1250,
      "acceptedReports": 15,
      "criticalCount": 3,
      "highCount": 5,
      "mediumCount": 7
    }
  ],
  "total": 100
}
```

### GET /api/hacktivity
```json
{
  "activities": [
    {
      "id": "hact_xxx",
      "researcherName": "Alice Johnson",
      "title": "SQL Injection in Login Form",
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
1. Fetch all reports with status 'accepted' or 'fixed'
2. For each report:
   - Get points from points_config based on severity
   - Create hall_of_fame entry
   - Update/create researcher_stats
   - Create hacktivity entry
3. Log progress and errors
4. Dry-run mode for testing

## Auto-Award Flow

```
Report Status Changed to 'accepted'
  ↓
Check if already awarded (hall_of_fame.reportId exists)
  ↓ (if not awarded)
Get points from points_config
  ↓
Create hall_of_fame entry
  ↓
Update researcher_stats (or create if new)
  ↓
Create hacktivity entry
  ↓
Log audit entry
  ↓
Return success
```

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

## Deployment Steps

1. Run migration on production
2. Run backfill script (dry-run first)
3. Deploy backend changes
4. Deploy frontend changes
5. Verify points awarded correctly
6. Monitor for errors

## Future Enhancements (Not Now)
- Monthly/Yearly leaderboards
- Achievement badges
- Bounty tracking
- Researcher opt-in/opt-out
- Email notifications
- Advanced duplicate detection (ML-based)
