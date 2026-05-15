# How to Set Admin Role in Clerk

## Problem
You can access `/admin` page but get **403 Forbidden** on `/api/admin/stats` and other admin API endpoints.

## Root Cause
Your Clerk user account doesn't have the `ADMIN` role set in `publicMetadata`, or it's set incorrectly.

## Solution: Set Your Role in Clerk Dashboard

### Step 1: Open Clerk Dashboard
1. Go to https://dashboard.clerk.com
2. Select your project: **Vanguard VDP**

### Step 2: Find Your User
1. Click **Users** in the left sidebar
2. Find your user account (search by email)
3. Click on your user to open the user details

### Step 3: Set Public Metadata
1. Scroll down to the **Metadata** section
2. Click on the **Public** tab
3. Add this JSON (or edit existing):

```json
{
  "role": "ADMIN"
}
```

**IMPORTANT:** 
- The role value must be exactly `"ADMIN"` (all caps, in quotes)
- Valid roles: `"USER"`, `"TRIAGER"`, `"ADMIN"`
- Do NOT use lowercase: ~~`"admin"`~~ ❌

### Step 4: Save and Sign Out
1. Click **Save** in Clerk dashboard
2. In your app, click your profile icon → **Sign out**
3. Sign back in

The role is cached in your session, so you **must sign out and back in** for changes to take effect.

---

## Verify It's Working

### Check Browser Console
After signing back in, open browser DevTools (F12) and check the Console tab when visiting `/admin`. You should see:

```
[getSessionRole] extracted role: ADMIN
```

If you see `USER` or `undefined`, the metadata wasn't set correctly.

### Test Admin Endpoints
1. Go to `/admin` - should load without errors
2. Check Network tab - `/api/admin/stats` should return `200 OK` (not 403)
3. Stats cards should populate with numbers

---

## Alternative: Set Role via Clerk API

If you prefer using the API:

```bash
curl -X PATCH https://api.clerk.com/v1/users/YOUR_USER_ID \
  -H "Authorization: Bearer YOUR_CLERK_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "public_metadata": {
      "role": "ADMIN"
    }
  }'
```

Replace:
- `YOUR_USER_ID` - Found in Clerk dashboard user details
- `YOUR_CLERK_SECRET_KEY` - From Clerk dashboard → API Keys

---

## Debugging

### Enable Debug Logs
Debug logging is now enabled in `lib/auth.ts`. Check your terminal/console for:

```
[getSessionRole] sessionClaims: { ... }
[getSessionRole] publicMetadata: { "role": "ADMIN" }
[getSessionRole] extracted role: ADMIN
```

### Common Issues

**Issue:** Still getting 403 after setting role
- **Fix:** Sign out and sign back in (role is cached in session)

**Issue:** Role shows as `undefined` in logs
- **Fix:** Check Clerk dashboard - metadata must be in **Public** tab, not Private

**Issue:** Role shows as `"admin"` (lowercase)
- **Fix:** Change to `"ADMIN"` (uppercase) in Clerk dashboard

**Issue:** Metadata shows `{ role: "ADMIN" }` but still 403
- **Fix:** Clear browser cookies and sign in again

---

## Role Hierarchy

The system uses this hierarchy:
- **USER** (level 1) - Can submit reports, view own dashboard
- **TRIAGER** (level 2) - Can access admin panel, triage reports
- **ADMIN** (level 3) - Full access (inherits TRIAGER permissions)

`requireRole('TRIAGER')` allows both TRIAGER and ADMIN users.

---

## Next Steps

1. Set your role to `"ADMIN"` in Clerk dashboard
2. Sign out and sign back in
3. Visit `/admin` - should work without 403 errors
4. Check terminal logs to confirm role detection

If still having issues after following these steps, check the debug logs and share them.
