# Data Deletion Guide

This guide explains how to completely remove a user's data from the Vanguard VDP platform.

## Overview

User data deletion is a two-step process:
1. **Delete from D1 Database** - Remove all reports, comments, and activity data
2. **Delete from Clerk** - Remove the user account and authentication data

---

## Prerequisites

- Admin access to Cloudflare D1 database
- Admin access to Clerk dashboard
- User's Clerk user ID or email address

---

## Step 1: Find the Clerk User ID

If you only have the email address, find the Clerk user ID:

```bash
npx wrangler d1 execute vanguard-security --remote --command="SELECT DISTINCT actor_id, actor_email FROM audit_logs WHERE actor_email = 'user@example.com' LIMIT 1;"
```

Or check the Clerk dashboard directly.

---

## Step 2: Delete from D1 Database

Replace `USER_CLERK_ID_HERE` with the actual Clerk user ID (e.g., `user_3DkSbdi2u4UyKlmQUyB5QUxQjAq`).

### Delete Comments
```bash
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM comments WHERE author_id = 'USER_CLERK_ID_HERE';"
```

### Delete Researcher Stats
```bash
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM researcher_stats WHERE researcher_id = 'USER_CLERK_ID_HERE';"
```

### Delete Hall of Fame Entries
```bash
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM hall_of_fame WHERE researcher_id = 'USER_CLERK_ID_HERE';"
```

### Delete Hacktivity Entries
```bash
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM hacktivity WHERE researcher_id = 'USER_CLERK_ID_HERE';"
```

### Delete Comments on User's Reports
```bash
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM comments WHERE report_id IN (SELECT id FROM reports WHERE clerk_user_id = 'USER_CLERK_ID_HERE');"
```

### Delete Audit Logs for User's Reports
```bash
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM audit_logs WHERE report_id IN (SELECT id FROM reports WHERE clerk_user_id = 'USER_CLERK_ID_HERE');"
```

### Delete Audit Logs by User
```bash
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM audit_logs WHERE actor_id = 'USER_CLERK_ID_HERE' OR actor_email = 'user@example.com';"
```

### Delete Reports
```bash
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM reports WHERE clerk_user_id = 'USER_CLERK_ID_HERE';"
```

---

## Step 3: Verify Deletion

Run this verification command to ensure all data is removed:

```bash
npx wrangler d1 execute vanguard-security --remote --command="
SELECT 
  (SELECT COUNT(*) FROM reports WHERE clerk_user_id = 'USER_CLERK_ID_HERE') as reports,
  (SELECT COUNT(*) FROM audit_logs WHERE actor_id = 'USER_CLERK_ID_HERE') as audit_logs,
  (SELECT COUNT(*) FROM comments WHERE author_id = 'USER_CLERK_ID_HERE') as comments,
  (SELECT COUNT(*) FROM hall_of_fame WHERE researcher_id = 'USER_CLERK_ID_HERE') as hall_of_fame,
  (SELECT COUNT(*) FROM researcher_stats WHERE researcher_id = 'USER_CLERK_ID_HERE') as researcher_stats,
  (SELECT COUNT(*) FROM hacktivity WHERE researcher_id = 'USER_CLERK_ID_HERE') as hacktivity;
"
```

**Expected Result:** All counts should be `0`.

---

## Step 4: Delete from Clerk

### Option 1: Clerk Dashboard (Recommended)

1. Go to https://dashboard.clerk.com
2. Select your **Vanguard VDP** application
3. Navigate to **Users**
4. Search for the user's email
5. Click on the user
6. Click **Delete user**
7. Confirm deletion

### Option 2: Clerk API

```bash
# Get user ID (if needed)
curl -X GET "https://api.clerk.com/v1/users?email_address=user@example.com" \
  -H "Authorization: Bearer YOUR_CLERK_SECRET_KEY"

# Delete user
curl -X DELETE "https://api.clerk.com/v1/users/USER_CLERK_ID_HERE" \
  -H "Authorization: Bearer YOUR_CLERK_SECRET_KEY"
```

---

## Complete Deletion Script

For convenience, here's a complete script that deletes all data in the correct order:

```bash
#!/bin/bash

# Usage: ./delete_user_data.sh user_3DkSbdi2u4UyKlmQUyB5QUxQjAq user@example.com

CLERK_USER_ID=$1
USER_EMAIL=$2

if [ -z "$CLERK_USER_ID" ] || [ -z "$USER_EMAIL" ]; then
  echo "Usage: $0 <clerk_user_id> <user_email>"
  exit 1
fi

echo "🗑️  Deleting data for: $USER_EMAIL ($CLERK_USER_ID)"
echo ""

echo "Step 1/8: Deleting comments by user..."
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM comments WHERE author_id = '$CLERK_USER_ID';"

echo "Step 2/8: Deleting researcher stats..."
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM researcher_stats WHERE researcher_id = '$CLERK_USER_ID';"

echo "Step 3/8: Deleting hall of fame entries..."
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM hall_of_fame WHERE researcher_id = '$CLERK_USER_ID';"

echo "Step 4/8: Deleting hacktivity entries..."
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM hacktivity WHERE researcher_id = '$CLERK_USER_ID';"

echo "Step 5/8: Deleting comments on user's reports..."
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM comments WHERE report_id IN (SELECT id FROM reports WHERE clerk_user_id = '$CLERK_USER_ID');"

echo "Step 6/8: Deleting audit logs for user's reports..."
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM audit_logs WHERE report_id IN (SELECT id FROM reports WHERE clerk_user_id = '$CLERK_USER_ID');"

echo "Step 7/8: Deleting audit logs by user..."
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM audit_logs WHERE actor_id = '$CLERK_USER_ID' OR actor_email = '$USER_EMAIL';"

echo "Step 8/8: Deleting reports..."
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM reports WHERE clerk_user_id = '$CLERK_USER_ID';"

echo ""
echo "✅ Database cleanup complete!"
echo ""
echo "📊 Verification:"
npx wrangler d1 execute vanguard-security --remote --command="
SELECT 
  (SELECT COUNT(*) FROM reports WHERE clerk_user_id = '$CLERK_USER_ID') as reports,
  (SELECT COUNT(*) FROM audit_logs WHERE actor_id = '$CLERK_USER_ID') as audit_logs,
  (SELECT COUNT(*) FROM comments WHERE author_id = '$CLERK_USER_ID') as comments,
  (SELECT COUNT(*) FROM hall_of_fame WHERE researcher_id = '$CLERK_USER_ID') as hall_of_fame,
  (SELECT COUNT(*) FROM researcher_stats WHERE researcher_id = '$CLERK_USER_ID') as researcher_stats,
  (SELECT COUNT(*) FROM hacktivity WHERE researcher_id = '$CLERK_USER_ID') as hacktivity;
"

echo ""
echo "⚠️  IMPORTANT: Don't forget to delete the user from Clerk dashboard!"
echo "   https://dashboard.clerk.com"
```

---

## Important Notes

### ⚠️ Warnings

1. **Irreversible**: Data deletion cannot be undone
2. **Audit Trail**: Deleting audit logs removes compliance trail
3. **Order Matters**: Execute deletions in the specified order to avoid foreign key constraints
4. **Backup First**: Consider backing up data before deletion

### 🔒 Data Deleted

When you delete a user's data, the following is removed:

- **Reports**: All vulnerability reports submitted by the user
- **Comments**: All comments made by the user and on their reports
- **Audit Logs**: All activity logs for the user's actions
- **Hall of Fame**: Recognition entries and points
- **Researcher Stats**: Statistics and rankings
- **Hacktivity**: Public activity feed entries

### 📋 Data Retained

The following data is **NOT** deleted (if applicable):

- **Encrypted Email**: If stored in other users' reports (as CC or reference)
- **System Logs**: Server logs and application logs
- **Backups**: Historical database backups (if any)

---

## GDPR Compliance

This deletion process satisfies GDPR "Right to be Forgotten" requirements by:

1. ✅ Removing all personal data from active database
2. ✅ Removing authentication credentials from Clerk
3. ✅ Removing all user-generated content
4. ✅ Removing all activity history

**Note**: Ensure you also purge database backups according to your retention policy.

---

## Troubleshooting

### Foreign Key Constraint Errors

If you encounter `FOREIGN KEY constraint failed` errors:

1. Delete child records first (comments, audit_logs)
2. Then delete parent records (reports)
3. Follow the order specified in the script above

### User Not Found

If the user ID is not found:

```bash
# Search by email in audit logs
npx wrangler d1 execute vanguard-security --remote --command="SELECT DISTINCT actor_id, actor_email FROM audit_logs WHERE actor_email LIKE '%user@example.com%';"

# Search in reports
npx wrangler d1 execute vanguard-security --remote --command="SELECT clerk_user_id, handle FROM reports WHERE clerk_user_id IS NOT NULL LIMIT 20;"
```

---

## Example: Complete Deletion

```bash
# 1. Find user ID
npx wrangler d1 execute vanguard-security --remote --command="SELECT DISTINCT actor_id FROM audit_logs WHERE actor_email = 'john@example.com' LIMIT 1;"

# Output: user_abc123xyz

# 2. Run deletion script
./delete_user_data.sh user_abc123xyz john@example.com

# 3. Verify all data is removed (should show all zeros)

# 4. Delete from Clerk dashboard
# Go to https://dashboard.clerk.com → Users → Search → Delete
```

---

## Support

For assistance with data deletion:
- **Security Team**: security@vanguardvdp.ph
- **Documentation**: `/docs/DATA_DELETION.md`
- **Clerk Support**: https://clerk.com/support
