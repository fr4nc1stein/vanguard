# Enterprise Admin Features - Vanguard VDP

## Overview

This document outlines the enterprise-level administrative features for Vanguard VDP, separate from the Triage workflow. These features are designed for platform management and configuration.

---

## 🎯 Feature Categories

### 1. User Management
**Purpose:** Manage platform users and their roles

**Features:**
- **User Listing**
  - Display all Clerk users with pagination
  - Show: Name, Email, Role, Join Date, Last Active
  - Filter by role (USER, TRIAGER, ADMIN)
  - Search by name or email
  
- **Role Management**
  - Promote USER → TRIAGER
  - Promote TRIAGER → ADMIN
  - Demote ADMIN → TRIAGER
  - Demote TRIAGER → USER
  - Audit log for all role changes
  
- **User Actions**
  - View user's submission history
  - View user's triage activity (for TRIAGER/ADMIN)
  - Suspend/unsuspend user accounts
  - Delete user accounts (with confirmation)

**Implementation:**
- Route: `/admin/users`
- API: `/api/admin/users` (GET, PATCH)
- Permissions: ADMIN only
- Uses Clerk Backend API for user management

---

### 2. Scope Management
**Purpose:** Define and manage in-scope targets for vulnerability submissions

**Features:**
- **Target CRUD**
  - Add new target domains/URLs
  - Edit existing targets
  - Remove targets (soft delete)
  - Mark targets as active/inactive
  
- **Target Details**
  - Domain/URL
  - Description
  - Target type (Web App, API, Mobile App, Infrastructure)
  - Status (Active, Deprecated, Out of Scope)
  - Added date and by whom
  
- **Scope Rules**
  - Define allowed vulnerability types per target
  - Set severity restrictions
  - Add scope notes/guidelines
  - Exclusions (e.g., /admin paths, third-party services)

**Implementation:**
- Route: `/admin/scope`
- API: `/api/admin/scope` (GET, POST, PATCH, DELETE)
- Database: New `scopes` table
- Permissions: ADMIN only
- Updates submission form dynamically

---

### 3. Program Settings
**Purpose:** Configure VDP program parameters

**Features:**
- **Response SLAs**
  - Acknowledgment time (default: 48 hours)
  - Initial response time (default: 7 days)
  - Resolution time by severity
  
- **Bounty Configuration** (if enabled)
  - Bounty ranges by severity
  - Payment methods
  - Minimum payout threshold
  
- **Notification Settings**
  - Discord webhook URL
  - Slack integration
  - Email notification templates
  - Notification triggers (new report, status change, etc.)
  
- **Submission Rules**
  - Max file upload size
  - Allowed file types
  - Rate limiting per user
  - Duplicate detection settings

**Implementation:**
- Route: `/admin/settings`
- API: `/api/admin/settings` (GET, PATCH)
- Database: New `program_settings` table
- Permissions: ADMIN only

---

### 4. Analytics & Reporting
**Purpose:** Platform insights and metrics

**Features:**
- **Dashboard Metrics**
  - Total reports by time period
  - Reports by severity distribution
  - Average response time
  - Top reporters (Hall of Fame candidates)
  - Triage team performance
  
- **Trend Analysis**
  - Report volume over time (chart)
  - Severity trends
  - Target vulnerability hotspots
  - MTTR (Mean Time To Resolution) by severity
  
- **Export Capabilities**
  - Export reports as CSV/JSON
  - Generate compliance reports
  - Custom date range filtering
  - Scheduled reports (future)

**Implementation:**
- Route: `/admin/analytics`
- API: `/api/admin/analytics` (GET)
- Uses existing audit logs and reports data
- Permissions: ADMIN and TRIAGER (read-only)

---

### 5. Audit Logs (Enhanced)
**Purpose:** Complete platform activity tracking

**Features:**
- **Comprehensive Logging**
  - All admin actions (user role changes, scope updates, settings changes)
  - All triage actions (already implemented)
  - User authentication events
  - Failed access attempts
  
- **Log Viewer**
  - Filter by action type, user, date range
  - Search by keyword
  - Export logs
  - Real-time log streaming (future)
  
- **Compliance**
  - Immutable audit trail
  - Retention policy configuration
  - GDPR compliance features

**Implementation:**
- Route: `/admin/audit-logs`
- API: `/api/admin/audit-logs` (GET)
- Extends existing `audit_logs` table
- Permissions: ADMIN only

---

### 6. Hall of Fame Management
**Purpose:** Manage researcher recognition

**Features:**
- **Researcher Profiles**
  - Auto-populate from accepted reports
  - Manual add/edit/remove
  - Profile fields: Name, Handle, Bio, Social Links, Avatar
  
- **Recognition Tiers**
  - Platinum (10+ critical/high findings)
  - Gold (5-9 critical/high findings)
  - Silver (3-4 critical/high findings)
  - Bronze (1-2 critical/high findings)
  
- **Bounty Tracking** (if enabled)
  - Total bounties paid per researcher
  - Pending payments
  - Payment history

**Implementation:**
- Route: `/admin/hall-of-fame`
- API: `/api/admin/hall-of-fame` (GET, POST, PATCH, DELETE)
- Database: New `hall_of_fame` table
- Permissions: ADMIN only
- Public view at `/hall-of-fame` (already exists)

---

### 7. Template Management
**Purpose:** Standardize communications

**Features:**
- **Email Templates**
  - Report acknowledgment
  - Status update notifications
  - Acceptance/rejection messages
  - Bounty payment notifications
  
- **Response Templates**
  - Common triage responses
  - Duplicate report message
  - Out of scope message
  - Insufficient information request
  
- **Template Variables**
  - {{reporter_name}}, {{ref_id}}, {{severity}}, etc.
  - Preview before sending
  - Version history

**Implementation:**
- Route: `/admin/templates`
- API: `/api/admin/templates` (GET, POST, PATCH, DELETE)
- Database: New `templates` table
- Permissions: ADMIN only

---

### 8. Integration Management
**Purpose:** Third-party service connections

**Features:**
- **Supported Integrations**
  - Discord webhooks (already implemented)
  - Slack notifications
  - Jira issue creation
  - GitHub Security Advisories
  - Email (SMTP configuration)
  
- **Integration Settings**
  - Enable/disable per integration
  - Configure webhooks and API keys
  - Test connection
  - Event mapping (which events trigger which integrations)

**Implementation:**
- Route: `/admin/integrations`
- API: `/api/admin/integrations` (GET, POST, PATCH, DELETE)
- Database: New `integrations` table
- Permissions: ADMIN only

---

## 🏗️ Implementation Priority

### Phase 1 (High Priority - Immediate)
1. ✅ **Triage Rename** - Completed
2. **User Management** - List users, promote to TRIAGER
3. **Scope Management** - Add/edit/remove targets

### Phase 2 (Medium Priority - Next Sprint)
4. **Program Settings** - Basic SLA and notification config
5. **Analytics Dashboard** - Basic metrics and charts
6. **Hall of Fame Management** - Dynamic population

### Phase 3 (Low Priority - Future)
7. **Template Management** - Email and response templates
8. **Integration Management** - Additional integrations beyond Discord
9. **Advanced Analytics** - Trend analysis, custom reports

---

## 🔐 Access Control

**ADMIN Role Only:**
- User Management (promote/demote roles)
- Scope Management (CRUD targets)
- Program Settings
- Template Management
- Integration Management
- Full Audit Log access

**TRIAGER Role:**
- Analytics Dashboard (read-only)
- Audit Logs (own actions only)

**USER Role:**
- No admin access

---

## 📊 Database Schema Changes

### New Tables Required

```sql
-- Scope targets
CREATE TABLE scopes (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  description TEXT,
  target_type TEXT, -- 'web_app', 'api', 'mobile', 'infrastructure'
  status TEXT DEFAULT 'active', -- 'active', 'deprecated', 'out_of_scope'
  allowed_vuln_types TEXT, -- JSON array
  exclusions TEXT, -- JSON array of excluded paths
  notes TEXT,
  created_by TEXT, -- Clerk user ID
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Program settings
CREATE TABLE program_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON value
  updated_by TEXT, -- Clerk user ID
  updated_at INTEGER NOT NULL
);

-- Hall of Fame
CREATE TABLE hall_of_fame (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT,
  handle TEXT NOT NULL,
  name TEXT,
  bio TEXT,
  avatar_url TEXT,
  social_links TEXT, -- JSON object
  tier TEXT, -- 'platinum', 'gold', 'silver', 'bronze'
  total_findings INTEGER DEFAULT 0,
  critical_findings INTEGER DEFAULT 0,
  high_findings INTEGER DEFAULT 0,
  total_bounty REAL DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Templates
CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'email', 'response'
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT, -- JSON array of available variables
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Integrations
CREATE TABLE integrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, -- 'discord', 'slack', 'jira', etc.
  enabled BOOLEAN DEFAULT FALSE,
  config TEXT NOT NULL, -- JSON config (webhook URLs, API keys, etc.)
  event_mapping TEXT, -- JSON object mapping events to actions
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

---

## 🎨 UI/UX Considerations

### Navigation Structure
```
Triage (current /admin)
  └─ Report Listing
  └─ Report Detail

Admin (new /admin/management or /settings)
  ├─ Users
  ├─ Scope
  ├─ Settings
  ├─ Analytics
  ├─ Audit Logs
  ├─ Hall of Fame
  ├─ Templates
  └─ Integrations
```

### Design Principles
- Consistent with existing Vanguard VDP design
- Use Tailwind CSS utility classes
- Mobile-responsive
- Clear action confirmations (especially for destructive actions)
- Loading states and error handling
- Toast notifications for success/error feedback

---

## 🚀 Suggested Next Steps

1. **Immediate:** Implement User Management
   - Create `/admin/users` page
   - List all Clerk users
   - Add "Promote to TRIAGER" button
   - Log role changes in audit log

2. **Next:** Implement Scope Management
   - Create `scopes` table migration
   - Create `/admin/scope` page
   - CRUD operations for targets
   - Update submission form to use dynamic targets

3. **Future:** Build out remaining features based on priority

---

## 📝 Notes

- All admin features should be behind ADMIN role check
- Use existing auth patterns (`requireRole('ADMIN')`)
- Maintain audit trail for all admin actions
- Consider rate limiting for sensitive operations
- Add confirmation dialogs for destructive actions
- Implement proper error handling and user feedback

---

**Last Updated:** May 15, 2026  
**Status:** Planning Phase  
**Owner:** Platform Team
