#!/bin/bash

# Vanguard VDP - User Data Deletion Script
# Usage: ./delete_user_data.sh <clerk_user_id> <user_email>
# Example: ./delete_user_data.sh user_3DkSbdi2u4UyKlmQUyB5QUxQjAq john@example.com

set -e  # Exit on error

CLERK_USER_ID=$1
USER_EMAIL=$2

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validate arguments
if [ -z "$CLERK_USER_ID" ] || [ -z "$USER_EMAIL" ]; then
  echo -e "${RED}Error: Missing required arguments${NC}"
  echo ""
  echo "Usage: $0 <clerk_user_id> <user_email>"
  echo ""
  echo "Example:"
  echo "  $0 user_3DkSbdi2u4UyKlmQUyB5QUxQjAq john@example.com"
  echo ""
  exit 1
fi

# Confirmation prompt
echo -e "${YELLOW}⚠️  WARNING: This will permanently delete all data for:${NC}"
echo -e "   Email: ${BLUE}$USER_EMAIL${NC}"
echo -e "   Clerk ID: ${BLUE}$CLERK_USER_ID${NC}"
echo ""
echo -e "${RED}This action CANNOT be undone!${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${YELLOW}Deletion cancelled.${NC}"
  exit 0
fi

echo ""
echo -e "${BLUE}🗑️  Starting data deletion process...${NC}"
echo ""

# Step 1: Delete comments by user
echo -e "${BLUE}Step 1/8:${NC} Deleting comments by user..."
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM comments WHERE author_id = '$CLERK_USER_ID';" > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Comments by user deleted"

# Step 2: Delete researcher stats
echo -e "${BLUE}Step 2/8:${NC} Deleting researcher stats..."
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM researcher_stats WHERE researcher_id = '$CLERK_USER_ID';" > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Researcher stats deleted"

# Step 3: Delete hall of fame entries
echo -e "${BLUE}Step 3/8:${NC} Deleting hall of fame entries..."
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM hall_of_fame WHERE researcher_id = '$CLERK_USER_ID';" > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Hall of fame entries deleted"

# Step 4: Delete hacktivity entries
echo -e "${BLUE}Step 4/8:${NC} Deleting hacktivity entries..."
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM hacktivity WHERE researcher_id = '$CLERK_USER_ID';" > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Hacktivity entries deleted"

# Step 5: Delete comments on user's reports
echo -e "${BLUE}Step 5/8:${NC} Deleting comments on user's reports..."
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM comments WHERE report_id IN (SELECT id FROM reports WHERE clerk_user_id = '$CLERK_USER_ID');" > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Comments on reports deleted"

# Step 6: Delete audit logs for user's reports
echo -e "${BLUE}Step 6/8:${NC} Deleting audit logs for user's reports..."
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM audit_logs WHERE report_id IN (SELECT id FROM reports WHERE clerk_user_id = '$CLERK_USER_ID');" > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Audit logs for reports deleted"

# Step 7: Delete audit logs by user
echo -e "${BLUE}Step 7/8:${NC} Deleting audit logs by user..."
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM audit_logs WHERE actor_id = '$CLERK_USER_ID' OR actor_email = '$USER_EMAIL';" > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Audit logs by user deleted"

# Step 8: Delete reports
echo -e "${BLUE}Step 8/8:${NC} Deleting reports..."
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM reports WHERE clerk_user_id = '$CLERK_USER_ID';" > /dev/null 2>&1
echo -e "${GREEN}✓${NC} Reports deleted"

echo ""
echo -e "${GREEN}✅ Database cleanup complete!${NC}"
echo ""

# Verification
echo -e "${BLUE}📊 Verification:${NC}"
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
echo -e "${YELLOW}⚠️  IMPORTANT: Next Steps${NC}"
echo -e "   1. Delete the user from Clerk dashboard:"
echo -e "      ${BLUE}https://dashboard.clerk.com${NC}"
echo -e "   2. Search for: ${BLUE}$USER_EMAIL${NC}"
echo -e "   3. Click 'Delete user' and confirm"
echo ""
echo -e "${GREEN}Data deletion process complete!${NC}"
