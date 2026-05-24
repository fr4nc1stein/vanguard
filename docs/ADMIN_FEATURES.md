# Enterprise Admin Features - Vanguard VDP

## Overview

This document tracks the current admin and triage feature surface in the codebase. It is based on the checked-in routes, API handlers, migrations, and database schema.

**Last Updated:** May 24, 2026
**Status:** Active implementation tracker
**Owner:** Platform Team

---

## Current Status Summary

| Area | Status | Notes |
|---|---:|---|
| Triage workflow | Done | Queue, report detail, status changes, severity changes, assignment, comments |
| User management | Done | Clerk user listing and role updates |
| Scope management | Done | Database-backed target CRUD and public scope API |
| Analytics dashboard | Done | Metrics, distributions, trends, top reporters/targets, CSV export |
| Activity logs | Done | Admin viewer, filters, search, pagination, CSV export |
| Hall of Fame management | Done | Leaderboard, hacktivity, points config, visibility controls |
| Response templates | Done | Template CRUD, variables, preview, triage usage |
| Program settings | Pending | No `/admin/settings`, API route, or `program_settings` table yet |
| Integration management | Pending | No `/admin/integrations`, API route, or `integrations` table yet |
| Notifications | Partial | New-report Discord webhook exists; email/in-app/configurable integrations pending |
| Advanced workflow features | Pending | Bulk actions, labels/tags, saved filters, bounty tracking, CVE/advisory linking |

---

## Implemented Features

### 1. User Management

**Status:** Done

**Implemented:**
- `/admin/users`
- `/api/admin/users`
- `/api/admin/users/[id]`
- Clerk Backend API integration
- User listing with search, sort, and pagination
- Role display for `USER`, `TRIAGER`, and `ADMIN`
- Role promotion/demotion through Clerk public metadata
- Confirmation dialog and toast feedback for role changes
- Safer admin handling: admin role changes are intentionally constrained through Clerk/manual workflows

**Still Pending:**
- User submission history from the user management page
- Triager activity detail view
- Suspend/unsuspend user actions
- Full user deletion UI
- Audit-log entries for all role changes

---

### 2. Scope Management

**Status:** Done

**Implemented:**
- `/admin/scope`
- `/api/admin/scopes`
- `/api/admin/scopes/[id]`
- `/api/scopes` for public/submit-form scope loading
- `scopes` table migration
- Create, edit, and delete targets
- Target type support: `web_app`, `api`, `mobile`, `infrastructure`
- Scope status support: `active`, `deprecated`, `out_of_scope`
- Search, sort, pagination, confirmations, and toast feedback
- Submission form uses database-backed scope targets

**Still Pending:**
- Allowed vulnerability types per target
- Severity restrictions per target
- Scope notes/guidelines and exclusions
- Soft-delete/archive flow instead of hard delete

---

### 3. Analytics & Reporting

**Status:** Done, with advanced reporting still pending

**Implemented:**
- `/admin/analytics`
- `/api/admin/analytics`
- Summary cards for total reports, recent reports, average response time, and resolved count
- Severity and status distribution charts
- Reports-over-time view
- Top targets and top reporters
- Date range selector for 7, 30, 90, and 365 days
- CSV export from the analytics dashboard

**Still Pending:**
- Custom calendar date range picker
- Export filtered/sorted data from every table
- Scheduled weekly/monthly reports
- Advanced trend analysis and custom report builder

---

### 4. Activity Logs

**Status:** Done

**Implemented:**
- `/admin/activity-logs`
- `/api/admin/activity-logs`
- `/api/admin/activity-logs/export`
- Centralized timeline viewer
- Action type filtering
- Date range filtering
- Actor/report filtering
- Search, pagination, and result counts
- CSV export
- Report links back to triage detail pages
- User display uses names instead of exposing emails or raw Clerk IDs
- Internal/public visibility support for audit log entries

**Still Pending:**
- Broader action taxonomy for future workflows
- Per-triager scoped audit views
- Retention policy controls

---

### 5. Hall of Fame Management

**Status:** Done, with recognition enhancements pending

**Implemented:**
- `/hall-of-fame`
- `/admin/hall-of-fame`
- `/api/hall-of-fame`
- `/api/hall-of-fame/stats`
- `/api/hacktivity`
- `/api/admin/hall-of-fame/entries`
- `/api/admin/hall-of-fame/leaderboard`
- `/api/admin/hall-of-fame/settings`
- `hall_of_fame`, `researcher_stats`, `hacktivity`, and `points_config` tables
- Public leaderboard
- Hacktivity feed
- Auto-award points on accepted/fixed reports
- Per-severity points configuration
- Visibility toggles
- Title redaction for sensitive values
- Clerk avatars and display names

**Still Pending:**
- Manual public title editing in admin UI
- Manual point adjustment with reason field
- Leaderboard CSV export
- Bulk visibility toggle
- Researcher profile pages
- Badges, milestones, and monthly/yearly awards
- Researcher opt-in/opt-out preferences
- Real-time leaderboard updates

---

### 6. Template Management

**Status:** Done for response templates

**Implemented:**
- `/admin/templates`
- `/api/admin/templates`
- `/api/admin/templates/[id]`
- `response_templates` table migration
- Template create, edit, preview, and soft delete
- Template categories: `triage`, `acceptance`, `rejection`, `info_request`, `general`
- Variable extraction and preview rendering
- Seeded templates for duplicate, out-of-scope, need-more-info, accepted, and cannot-reproduce responses

**Still Pending:**
- Email delivery integration
- Template version history
- Dedicated researcher-facing vulnerability report templates
- Automated template use for notifications

---

### 7. Communication & Collaboration

**Status:** Done for comments/internal notes, pending advanced collaboration

**Implemented:**
- `/api/reports/[id]/comments`
- `/api/reports/[id]/comments/[commentId]/toggle-internal`
- `/api/reports/[id]/audit-logs/[logId]/toggle-internal`
- `comments` table migration
- Researcher/staff comments
- Staff-only internal comments
- Unified chronological timeline of comments and audit logs
- Visibility toggles for internal/public entries
- Markdown support for report content

**Still Pending:**
- @mentions in comments
- Assignment notifications
- Team activity feed
- Saved per-user notification preferences

---

## Pending Admin Modules

### Program Settings

**Status:** Pending

**Not implemented yet:**
- `/admin/settings`
- `/api/admin/settings`
- `program_settings` table

**Expected feature scope:**
- Response SLA configuration
- Bounty settings, if bounty mode is enabled
- Notification triggers and defaults
- Submission rules such as upload size, allowed file types, and rate limits
- Duplicate detection settings
- Data retention policy configuration

---

### Integration Management

**Status:** Pending

**Not implemented yet:**
- `/admin/integrations`
- `/api/admin/integrations`
- `integrations` table

**Expected feature scope:**
- Enable/disable configured integrations
- Slack notifications
- Jira issue creation
- GitHub issue/security advisory integration
- SMTP/email provider configuration
- Custom webhooks
- Test connection action
- Event-to-integration mapping

**Current integration support:**
- New report Discord webhook via `DISCORD_WEBHOOK_URL` in `/api/reports`

---

## Pending Product Features

### Researcher Experience

- Report drafts before submit
- Automatic duplicate detection
- Submission wizard or guided report flow
- Researcher-facing vulnerability templates
- Researcher public recognition preferences

### Triage Workflow

- Bulk actions for assignment/status changes
- Custom labels/tags
- Saved filters
- Quick actions menu
- Bounty/reward tracking
- CVE/advisory linking
- Automatic duplicate suggestions

### API & External Access

- Public researcher API
- API documentation
- Webhook delivery logs
- API keys or OAuth flow for external clients

### Dashboard Enhancements

- Customizable widgets
- Real-time updates through WebSockets or server-sent events
- Dark mode
- Keyboard shortcuts

---

## Access Control

**ADMIN Role Only:**
- Admin console
- User Management
- Scope Management
- Template Management writes
- Hall of Fame management
- Full Activity Log access
- Future Program Settings and Integration Management

**TRIAGER Role:**
- Triage queue
- Report detail and status/severity/assignment workflow
- Commenting and internal notes
- Analytics read access
- Template read/use access

**USER Role:**
- Submit reports
- View own dashboard
- View own report details
- Comment on own reports

---

## Current Database Tables

Defined in Drizzle schema:
- `reports`
- `audit_logs`
- `scopes`
- `comments`
- `points_config`
- `researcher_stats`
- `hall_of_fame`
- `hacktivity`

Defined by migration and accessed through D1 prepared statements:
- `response_templates`

Not implemented yet:
- `program_settings`
- `integrations`
- `notifications`
- `report_labels` / `report_tags`
- `saved_filters`
- `report_drafts`
- `bounties` / `rewards`

---

## Suggested Next Steps

1. Implement Program Settings:
   - Add `program_settings` migration and schema mapping
   - Add `/admin/settings`
   - Add `/api/admin/settings`
   - Start with SLA, rate-limit, and notification trigger settings

2. Implement Integration Management:
   - Add `integrations` migration and schema mapping
   - Add `/admin/integrations`
   - Add `/api/admin/integrations`
   - Move Discord webhook configuration from env-only to managed settings where appropriate

3. Add notification infrastructure:
   - Start with assignment and status-change notifications
   - Add email provider abstraction
   - Add notification preferences and delivery logs

4. Improve triage productivity:
   - Add labels/tags
   - Add saved filters
   - Add bulk actions

---

## Engineering Notes

- Protect admin routes with `requireRole('ADMIN')`.
- Allow triager read/use access only where needed, such as analytics and templates.
- Maintain audit trails for sensitive admin actions.
- Keep PII out of activity/audit API responses.
- Prefer D1/Drizzle schema updates and migrations before UI work.
- Test Cloudflare compatibility with `npm run dev:cf` for database-backed features.
