# Database Schema Refactor: Dynamic Name Fetching

## Problem
User names were stored in multiple tables (`comments.author_name`, `researcher_stats.researcher_name`, `hall_of_fame.researcher_name`, `hacktivity.researcher_name`). When users changed their names in Clerk, the database still showed old names, requiring manual SQL updates.

## Solution
Remove all stored name columns and fetch names dynamically from Clerk using `clerk_user_id`. This ensures names are always current and automatically update when users change them.

## Changes Made

### 1. Database Schema (`lib/db/schema.ts`)
**Removed columns:**
- `comments.authorName` → Use `authorId` (Clerk user ID)
- `researcher_stats.researcherName` → Use `researcherId` (Clerk user ID)
- `hall_of_fame.researcherName` → Use `researcherId` (Clerk user ID)
- `hacktivity.researcherName` → Use `researcherId` (Clerk user ID)

### 2. Service Layer (`lib/services/hall-of-fame.ts`)
**Updated functions:**
- `awardPoints()` - Removed `researcherName` from INSERT statements
- `updateResearcherStats()` - Removed `researcherName` parameter and field
- `getLeaderboard()` - Fetch names from Clerk dynamically
- `getHacktivity()` - Fetch names from Clerk dynamically

### 3. API Endpoints
**Updated to fetch names from Clerk:**
- `/api/reports/[id]/comments` - POST (comment creation)
- `/api/hall-of-fame` - GET (public leaderboard)
- `/api/hacktivity` - GET (public activity feed)
- `/api/admin/hall-of-fame/leaderboard` - GET
- `/api/admin/hall-of-fame/entries` - GET

### 4. Migration Script
**File:** `migrations/0007_remove_stored_names.sql`

Creates new tables without name columns, copies data, and replaces old tables.

## Benefits

✅ **Always Current** - Names automatically update when users change them in Clerk
✅ **No Manual Updates** - No need to run SQL queries to update names
✅ **Single Source of Truth** - Clerk is the only source for user names
✅ **Privacy Friendly** - Uses `getDisplayName()` helper with alias support
✅ **Consistent** - Same pattern as reports table (already uses `clerk_user_id`)

## Name Display Priority

1. Custom alias (from `publicMetadata.alias`)
2. First name + Last name
3. First name only
4. Username
5. Email prefix (e.g., `john` from `john@example.com`)
6. Fallback: `'Anonymous'`

## Migration Steps

1. **Backup database** (recommended)
2. **Run migration:**
   ```bash
   npx wrangler d1 execute vanguard-security --remote --file=migrations/0007_remove_stored_names.sql
   ```
3. **Deploy code changes**
4. **Verify** - Check that names display correctly in:
   - Comments
   - Hall of Fame
   - Hacktivity feed
   - Leaderboard

## Rollback Plan

If issues occur, the migration script includes verification queries. The old tables are only dropped after successful data copy, so you can restore from backup if needed.

## Performance Considerations

- **Clerk API calls**: Each name fetch requires a Clerk API call
- **Caching**: Names are fetched per request (not cached)
- **Rate limits**: Clerk has generous rate limits, but monitor usage
- **Optimization**: Consider implementing a short-lived cache if needed

## Testing Checklist

- [ ] Comments show correct author names
- [ ] Hall of Fame shows correct researcher names
- [ ] Hacktivity feed shows correct researcher names
- [ ] Leaderboard shows correct researcher names
- [ ] Names update when users change them in Clerk
- [ ] Anonymous users show fallback name
- [ ] Deleted users show fallback name
