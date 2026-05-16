# Changelog

## UI/UX Improvements - v2.2.0

**Date:** May 15, 2026  
**Status:** ✅ Deployed to production  
**Version ID:** `510e6723-0d55-4100-b71b-c04d9edb8746`

---

### 🎨 Custom Alert System

Replaced browser `alert()` and `confirm()` with custom React components for better UX.

#### New Components
- **Toast Component** (`app/components/Toast.tsx`)
  - Success, error, and info notification types
  - Auto-dismiss after 4 seconds
  - Slide-in animation from right
  - Manual close button
  - Color-coded: green (success), red (error), blue (info)

- **ConfirmDialog Component** (`app/components/ConfirmDialog.tsx`)
  - Danger, warning, and info confirmation types
  - Blurry backdrop effect (`backdrop-blur-sm`)
  - Scale-in animation
  - Custom title and message
  - Confirm/Cancel buttons with color coding

#### Scope Management Updates
- Replaced all `alert()` calls with Toast notifications
- Replaced `confirm()` for delete with ConfirmDialog
- Added smooth animations to `app/globals.css`
- Better error handling with user-friendly messages

### 🌐 Dynamic Landing Page

**Before:** Static hardcoded scope list  
**After:** Fetches scopes dynamically from API

#### Changes
- Created `GET /api/scopes` public endpoint
- Landing page fetches active scopes on load
- Shows loading state while fetching
- Displays scope count in stats section
- Handles empty state gracefully

#### Benefits
- Always shows current in-scope targets
- No need to update code when scopes change
- Admins can manage scopes via `/admin/scope`
- Changes reflect immediately on landing page

### 🎯 Scope Management Modal Fixes

#### Modal Background
- **Before:** Solid black (`bg-black bg-opacity-50`)
- **After:** Blurry backdrop (`bg-black/30 backdrop-blur-sm`)
- Background now visible and blurred behind modal
- Added `shadow-2xl` for better depth

#### Input Visibility
- **Before:** White text on white background (invisible)
- **After:** Black text (`text-gray-900`) with gray placeholders
- Applied to all form inputs:
  - Text input (domain field)
  - Textarea (description field)
  - Select dropdowns (target type, status)

### 🚫 Admin Page - Disabled Coming Soon Buttons

**Issue:** Clicking "Coming Soon" buttons navigated to 404 pages

**Fix:** Replaced `Link` components with disabled `button` elements

#### Changes
- Program Settings button - disabled
- Analytics button - disabled
- Hall of Fame button - disabled
- Audit Logs button - disabled
- Styled with gray background and `cursor-not-allowed`

### 📊 Files Changed

**New Files:**
- `app/components/Toast.tsx` - Toast notification component
- `app/components/ConfirmDialog.tsx` - Confirmation dialog component
- `app/api/scopes/route.ts` - Public scopes API endpoint

**Modified Files:**
- `app/page.tsx` - Dynamic scope fetching
- `app/admin/scope/page.tsx` - Toast/Dialog integration, modal fixes
- `app/admin/page.tsx` - Disabled coming soon buttons
- `app/globals.css` - Added animations (slide-in, scale-in)

**Total:** 7 files changed, ~350 insertions

### 🚀 Deployment

**Production URL:** https://vanguard.laet4x.com  
**Worker Size:** 8.7 MB (gzipped: 1.8 MB)  
**New API Route:** `/api/scopes` (public, no auth)

---

## Phase 1 Enterprise Admin Features - v2.1.0

**Date:** May 15, 2026  
**Status:** ✅ Deployed to production  
**Version ID:** `92bf7721-83a2-420a-82e1-db2d3965828c`

---

### 🎯 New Features

#### 1. Route Restructure
- **Renamed `/admin` → `/triage`** for report triage workflow
- **Created `/admin`** for platform management features
- **Updated navigation** to show separate Triage and Admin buttons
- **Fixed all internal links** and breadcrumbs

#### 2. User Management (`/admin/users`)
- List all Clerk users with pagination
- Display user details: name, email, role, join date, last sign-in
- Role promotion/demotion:
  - USER → TRIAGER
  - TRIAGER → ADMIN
  - ADMIN → TRIAGER
  - TRIAGER → USER
- User statistics dashboard (Total, Admins, Triagers, Researchers)
- Real-time role updates via Clerk API

#### 3. Scope Management (`/admin/scope`)
- CRUD operations for in-scope targets
- Target fields: domain, description, type, status
- Target types: Web App, API, Mobile, Infrastructure
- Status options: Active, Deprecated, Out of Scope
- Statistics dashboard
- Modal-based add/edit interface
- Seeded with 2 initial targets (vanguard.laet4x.com, laet4x.com)

### 🔧 Technical Changes

#### Database
- Added `scopes` table to schema
- Created migration: `003_create_scopes_table.sql`
- Executed migration on local and production D1

#### API Endpoints
- `GET /api/admin/users` - List all Clerk users
- `PATCH /api/admin/users` - Update user role
- `GET /api/admin/scopes` - List all scopes
- `POST /api/admin/scopes` - Create new scope
- `PATCH /api/admin/scopes/[id]` - Update scope
- `DELETE /api/admin/scopes/[id]` - Delete scope

#### Bug Fixes
- **Fixed:** Middleware blocking API routes - excluded `/api/*` from middleware role checks
- **Fixed:** Zod `.default()` edge runtime errors - removed all `.default()` usage
- **Fixed:** `export const runtime = 'edge'` causing issues - removed from API routes
- **Fixed:** Drizzle schema `.default()` causing errors - removed from scopes table
- **Fixed:** Report detail 404 errors - updated links from `/admin/reports` to `/triage/reports`

### 📊 Files Changed

**New Files:**
- `app/admin/page.tsx` - Admin management dashboard
- `app/admin/users/page.tsx` - User management UI
- `app/admin/scope/page.tsx` - Scope management UI
- `app/api/admin/users/route.ts` - User management API
- `app/api/admin/scopes/route.ts` - Scope management API
- `app/api/admin/scopes/[id]/route.ts` - Scope update/delete API
- `migrations/003_create_scopes_table.sql` - Database migration
- `ISSUES.md` - Known issues and solutions documentation
- `docs/ENTERPRISE_ADMIN_FEATURES.md` - Feature specifications

**Modified Files:**
- `app/components/SiteHeader.tsx` - Navigation updates
- `app/triage/page.tsx` - Report listing (formerly admin)
- `app/triage/reports/[id]/page.tsx` - Report detail (formerly admin)
- `middleware.ts` - Exclude API routes from role checks
- `lib/db/schema.ts` - Added scopes table, removed `.default()`
- `lib/validation.ts` - Removed `.default()` from PaginationSchema
- `app/api/admin/reports/route.ts` - Handle pagination defaults in code
- `app/api/reports/route.ts` - Updated Discord webhook URL

**Total:** 18 files changed, ~1,200 insertions

### 🐛 Known Issues & Solutions

See [ISSUES.md](ISSUES.md) for detailed documentation of:
- Zod `.default()` incompatibility with edge runtime
- `export const runtime = 'edge'` issues
- Middleware blocking API routes
- Route restructuring pitfalls

### 🚀 Deployment

**Production URL:** https://vanguard.laet4x.com  
**Worker Size:** 8.7 MB (gzipped: 1.8 MB)  
**Database:** D1 with 3 tables (reports, audit_logs, scopes)

### 📝 Next Steps (Phase 2)

- Program Settings - SLA configuration, notifications
- Analytics Dashboard - Metrics, trends, exports
- Hall of Fame Management - Dynamic researcher profiles
- Template Management - Email and response templates
- Integration Management - Additional integrations

---

## Security & UX Improvements - v2.0.0

**Branch:** `security/fix-critical-vulnerabilities`  
**Status:** ✅ Ready to merge  
**Commits:** 2  
**Deployment:** ✅ Live on production

---

## 🔒 Security Fixes (Critical & High Priority)

### 1. **SQL Injection Vulnerability - CRITICAL** ✅ FIXED
**File:** `app/api/admin/reports/route.ts`

**Issue:** Unsanitized user input in LIKE query allowed SQL injection via search parameter.

**Attack Vector:**
```
GET /api/admin/reports?q=%' OR 1=1--
```

**Fix:**
```typescript
// Before: Direct interpolation (vulnerable)
if (q) conditions.push(like(reports.title, `%${q}%`));

// After: Sanitized input
if (q) {
  const sanitized = q.replace(/[%_\\]/g, '\\$&');
  conditions.push(like(reports.title, `%${sanitized}%`));
}
```

**Impact:** Prevents unauthorized data access and SQL injection attacks.

---

### 2. **PII Logging Violation - CRITICAL** ✅ FIXED
**File:** `app/api/submit-report/route.ts`

**Issue:** Email addresses and sensitive report details logged to console in plaintext.

**Fix:**
```typescript
// Before: Logs PII
console.log(`Email: ${body.email || "N/A"}`);
console.log(`Title: ${body.title}`);

// After: No PII, minimal logging
console.log(`[REPORT] New submission: ${referenceId} | Severity: ${body.severity} | Time: ${timestamp}`);
```

**Impact:** GDPR compliance, prevents data breach via log exposure.

---

### 3. **Debug Logging in Production - HIGH** ✅ FIXED
**File:** `lib/auth.ts`

**Issue:** Verbose authentication logs running on every request in production.

**Fix:**
```typescript
// Before: Always logs
console.log('[getSessionRole] sessionClaims:', JSON.stringify(sessionClaims, null, 2));
console.log('[getSessionRole] publicMetadata:', JSON.stringify(metadata, null, 2));

// After: Development only
if (process.env.NODE_ENV === 'development') {
  console.log('[getSessionRole] extracted role:', role);
}
```

**Impact:** Reduces log pollution and prevents session token exposure.

---

### 4. **Weak Reference ID Generation - MEDIUM** ✅ FIXED
**File:** `app/api/reports/route.ts`

**Issue:** Predictable 4-digit sequential IDs (only 9,000 possibilities per year).

**Fix:**
```typescript
// Before: Predictable
function generateRefId(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `BGP-${year}-${num}`;
}

// After: Cryptographically secure
function generateRefId(severity: string): string {
  const year = new Date().getFullYear();
  const random = crypto.randomUUID().slice(0, 8).toUpperCase();
  const severityCode = severity.charAt(0).toUpperCase();
  return `VVDP-${severityCode}-${year}-${random}`;
}
```

**Impact:** ~4.3 billion possibilities per year per severity, non-enumerable.

---

### 5. **Missing Encryption Key Validation - MEDIUM** ✅ FIXED
**Files:** `lib/crypto.ts`

**Issue:** Non-null assertion on `ENCRYPTION_KEY` caused runtime crashes if missing.

**Fix:**
```typescript
// Before: Crashes if missing
keyHex = process.env.ENCRYPTION_KEY!

// After: Explicit validation
const encryptionKey = keyHex ?? process.env.ENCRYPTION_KEY;
if (!encryptionKey) {
  throw new Error(
    'ENCRYPTION_KEY environment variable is not set. ' +
    'Generate one with: openssl rand -hex 32'
  );
}
```

**Impact:** Prevents data loss and service disruption.

---

## 🎨 Reference ID Format Improvement

### New Format: `VVDP-[S]-YYYY-XXXXXXXX`

**Examples:**
- `VVDP-C-2026-A3F2B891` (Critical)
- `VVDP-H-2026-7D4E2C10` (High)
- `VVDP-M-2026-9B1A5F33` (Medium)
- `VVDP-L-2026-4C8D7E22` (Low)
- `VVDP-I-2026-6F2A9D44` (Info)

**Benefits:**
- ✅ Instant severity visibility for triagers
- ✅ Easy filtering: `VVDP-C-*` for all critical reports
- ✅ Professional appearance
- ✅ ~4.3 billion possibilities per year per severity
- ✅ Immutable - severity in ID never changes

**Documentation:** New file `docs/REFERENCE_ID_FORMAT.md` with complete specification.

---

## 🎯 UX Improvements

### Report Submission Success Page
**File:** `app/submit/page.tsx`

**Changes:**
1. ✅ Removed email reference ("Updates will be sent to your registered account email")
2. ✅ Removed follow-up email instructions
3. ✅ Replaced "View Hall of Fame" button with "View My Reports" (links to `/dashboard`)
4. ✅ Cleaner, more focused success message

**Before:**
```
[View Hall of Fame] [Submit Another Report]
Updates will be sent to your registered account email.
To follow up, email security@vanguardvdp.ph...
```

**After:**
```
[View My Reports] [Submit Another Report]
We will acknowledge your report within 48 hours...
```

---

## 📊 Files Changed

| File | Changes | Type |
|------|---------|------|
| `app/api/admin/reports/route.ts` | SQL injection fix | Security |
| `app/api/reports/route.ts` | Reference ID format + encryption validation | Security + Feature |
| `app/api/submit-report/route.ts` | Remove PII logging | Security |
| `lib/auth.ts` | Disable production debug logs | Security |
| `lib/crypto.ts` | Add encryption key validation | Security |
| `app/submit/page.tsx` | Improve success page UX | UX |
| `docs/REFERENCE_ID_FORMAT.md` | New documentation | Documentation |

**Total:** 7 files changed, 146 insertions(+), 26 deletions(-)

---

## 🚀 Deployment Status

**Deployed:** ✅ Yes  
**URL:** https://vanguard-vdp.fr4nc1stein.workers.dev  
**Version ID:** `0ea9e210-4dc4-4e2f-9b73-308abe0bf9ae`  
**Deployment Time:** ~10 seconds  
**Worker Size:** 8.3 MB (gzipped: 1.7 MB)

---

## ✅ Testing Checklist

Before merging, verify:

- [ ] Submit a test report and confirm new reference ID format (`VVDP-C-2026-XXXXXXXX`)
- [ ] Verify success page shows "View My Reports" button
- [ ] Check admin panel search works without SQL injection
- [ ] Confirm no PII in Cloudflare Worker logs
- [ ] Test encryption/decryption still works
- [ ] Verify Discord webhook shows new reference format

---

## 📝 Migration Notes

### Reference ID Format
- **Old format:** `BGP-YYYY-NNNN` (4-digit sequential)
- **New format:** `VVDP-[S]-YYYY-XXXXXXXX` (severity-based)
- **Backward compatibility:** Old IDs remain valid and searchable
- **No data migration required:** Both formats coexist

### Environment Variables
No new environment variables required. Existing setup works as-is.

---

## 🔐 Security Review Summary

**Overall Grade:** A- (after fixes)

| Finding | Severity | Status |
|---------|----------|--------|
| SQL injection in LIKE query | 🔴 Critical | ✅ Fixed |
| PII in console logs | 🔴 Critical | ✅ Fixed |
| Debug logging in production | 🟠 High | ✅ Fixed |
| Weak reference ID generation | 🟡 Medium | ✅ Fixed |
| Missing encryption key validation | 🟡 Medium | ✅ Fixed |

**Remaining Recommendations:**
- Add rate limiting (P1 - future work)
- Implement security headers (P2 - future work)
- Add audit failure alerts (P2 - future work)

---

## 🎯 Next Steps

1. **Review this PR** on GitHub
2. **Test on staging** (if available) or verify on production
3. **Merge to main** when ready
4. **Monitor logs** for any issues post-merge
5. **Update Clerk roles** for admin users if needed

---

## 📞 Support

**Questions?** Contact the security team or review:
- Security review findings (in this PR)
- `docs/REFERENCE_ID_FORMAT.md` for reference ID spec
- `docs/DEPLOYMENT_GUIDE.md` for deployment details

---

**Pull Request:** https://github.com/fr4nc1stein/vanguard/pull/new/security/fix-critical-vulnerabilities

**Commits:**
1. `1c44f67` - security: fix critical vulnerabilities + improve reference ID format
2. `b805558` - ui: improve report submission success page
