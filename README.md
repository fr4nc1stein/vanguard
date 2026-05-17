# Vanguard VDP

A modern vulnerability disclosure platform built for security researchers and security teams. Submit encrypted reports, track resolution status, and manage your bug bounty program with enterprise-grade features.

**Live:** https://vanguard-vdp.fr4nc1stein.workers.dev  
**Version:** v2.5.0  
**Status:** ✅ Production Ready

## Documentation

| Doc | Description |
|-----|-------------|
| [CHANGELOG.md](CHANGELOG.md) | Version history and feature releases |
| [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Full deployment, Cloudflare/Clerk/Google setup, common fixes |
| [docs/ROLE_SETUP_INSTRUCTIONS.md](docs/ROLE_SETUP_INSTRUCTIONS.md) | How to assign ADMIN/TRIAGER roles in Clerk |
| [docs/blueprint.md](docs/blueprint.md) | Architecture, data model, API surface, security design |
| [docs/agent.md](docs/agent.md) | Developer persona — stack rules, failure modes, code patterns |
| [ISSUES.md](ISSUES.md) | Known issues, edge runtime pitfalls, debugging tips |
| [docs/ADMIN_FEATURES.md](docs/ADMIN_FEATURES.md) | Admin features roadmap and specifications |
| [docs/HALL_OF_FAME.md](docs/HALL_OF_FAME.md) | Hall of Fame system documentation |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.5 (App Router) |
| Runtime | Cloudflare Workers via `@opennextjs/cloudflare` |
| Database | Cloudflare D1 (SQLite) — binding `DB` |
| ORM | Drizzle ORM |
| Auth | Clerk v7 |
| Encryption | Web Crypto AES-GCM-256 |
| Styling | Tailwind CSS v4 |
| Validation | Zod v4 |

## ✅ Deployed Features

### 🔐 Core Platform Features
- ✅ **Report Submission** — AES-GCM-256 encrypted, authenticated users only
- ✅ **Researcher Dashboard** — View own submissions with status tracking
- ✅ **Report Detail View** — Full report viewing with markdown support
- ✅ **Comments System** — Two-way communication between researchers and triage team
- ✅ **Triage Workflow** — Complete report lifecycle management
- ✅ **Security Policy** — Responsible disclosure guidelines and scope

### 🏆 Hall of Fame System (v2.5.0)
- ✅ **Public Leaderboard** — Points-based researcher rankings
- ✅ **Time Period Filters** — All Time, This Month, This Year views
- ✅ **Hacktivity Feed** — Real-time activity of accepted/resolved reports
- ✅ **Auto-Award System** — Automatic points on report acceptance
- ✅ **Visibility Management** — Per-entry public/private toggle
- ✅ **Points Configuration** — Customizable points per severity
- ✅ **Title Redaction** — Automatic removal of sensitive info (emails, IPs, tokens)
- ✅ **Researcher Profiles** — Clerk-integrated avatars and names
- ✅ **Admin Entry Management** — Search, pagination, and visibility control
- ✅ **Triage Integration** — Toggle visibility from report detail page

### 👥 User & Access Management
- ✅ **Role-Based Access Control** — USER, TRIAGER, ADMIN roles
- ✅ **User Management** (`/admin/users`) — List, search, sort, and manage user roles
- ✅ **Role Promotion** — Promote users to TRIAGER with confirmation dialogs
- ✅ **Safe ADMIN Management** — ADMIN role changes require manual Clerk access
- ✅ **Clerk Integration** — Seamless authentication with user profiles

### 🎯 Scope & Target Management
- ✅ **Scope Management** (`/admin/scope`) — Add, edit, delete in-scope targets
- ✅ **Target Types** — Web App, API, Mobile, Infrastructure
- ✅ **Status Tracking** — Active, Deprecated, Out of Scope
- ✅ **Dynamic Scope** — No hardcoded targets, fully database-driven

### 📊 Analytics & Reporting
- ✅ **Analytics Dashboard** (`/admin/analytics`) — Comprehensive metrics and insights
- ✅ **Summary Statistics** — Total reports, recent activity, response times
- ✅ **Data Visualizations** — Severity/status distributions, trends over time
- ✅ **Top Reporters** — Leaderboard with Clerk user names
- ✅ **Top Targets** — Most reported assets
- ✅ **CSV Export** — Export analytics data for compliance
- ✅ **Date Range Selector** — 7, 30, 90, or 365 days

### 🔍 Modern Table Features (v2.4.0)
All data tables include:
- ✅ **Search** — Real-time filtering across multiple fields
- ✅ **Column Sorting** — Click headers to sort ascending/descending
- ✅ **Pagination** — Smart pagination with 20-25 items per page
- ✅ **Result Counts** — Shows filtered/total results
- ✅ **Responsive Design** — Mobile and desktop optimized

**Tables Enhanced:**
- Researcher Dashboard (`/dashboard`)
- Triage Dashboard (`/triage`)
- User Management (`/admin/users`)
- Scope Management (`/admin/scope`)

### 🛡️ Security & Audit
- ✅ **End-to-End Encryption** — AES-GCM-256 for report bodies
- ✅ **Audit Logging** — Complete activity tracking for all report actions
- ✅ **Role-Based Permissions** — Middleware-enforced access control
- ✅ **Secure Decryption** — Staff and report owners can decrypt
- ✅ **Clean Audit Logs** — Only meaningful actions logged

### 💬 Communication Features
- ✅ **Comments System** — Researchers and staff can communicate
- ✅ **Role Badges** — Visual indicators for USER/TRIAGER/ADMIN
- ✅ **Timestamps** — All comments timestamped
- ✅ **Markdown Support** — Rich text formatting in report descriptions
- ✅ **Activity Timeline** — Complete history of report changes

### 🎨 UI/UX Enhancements
- ✅ **Toast Notifications** — Success/error feedback
- ✅ **Confirmation Dialogs** — Prevent accidental actions
- ✅ **Status Badges** — Color-coded report statuses
- ✅ **Severity Indicators** — Visual severity classification
- ✅ **Responsive Tables** — Mobile-friendly data views
- ✅ **Loading States** — Smooth transitions and feedback

## Getting Started

```bash
npm install --legacy-peer-deps
cp .env.local.example .env.local  # fill in Clerk keys + ENCRYPTION_KEY
```

### Development

```bash
# Fast UI work — no D1 (hot reload)
npm run dev

# Full Cloudflare stack — D1 writes to .wrangler/state/
npm run dev:cf
```

> Use `npm run dev:cf` for anything that reads/writes the database. Plain `npm run dev` won't have the D1 binding.

### Required environment variables

```
ENCRYPTION_KEY=                        # 64 hex chars: openssl rand -hex 32
CLERK_SECRET_KEY=                      # From Clerk dashboard (sk_live_...)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=     # From Clerk dashboard (pk_live_...)
```

> These must also be pushed as Worker secrets:
> ```bash
> npx wrangler secret put CLERK_SECRET_KEY
> npx wrangler secret put NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
> npx wrangler secret put ENCRYPTION_KEY
> ```

### Database setup (first time)

```bash
# Remote (production)
npx wrangler d1 execute vanguard-security --remote --file=migrations/0001_schema.sql --yes
```

### Deploy

```bash
npm run deploy
```

## Project Structure

```
app/
├── page.tsx                          # Home — Security Policy
├── layout.tsx                        # Root layout + ClerkProvider
├── submit/page.tsx                   # Submit form (auth required)
├── dashboard/page.tsx                # Researcher's own submissions
├── hall-of-fame/page.tsx             # Public Hall of Fame
├── admin/page.tsx                    # Admin triage panel (ADMIN/TRIAGER only)
├── admin/reports/[id]/page.tsx       # Report detail + triage actions
├── sign-in/ & sign-up/               # Clerk auth pages
└── api/                              # API routes (no edge runtime flag needed)
lib/
├── db/                               # getDb(), getCfEnv(), Drizzle schema
├── crypto.ts                         # AES-GCM-256 encrypt/decrypt
├── validation.ts                     # Zod schemas + VALID_TARGETS
├── auth.ts                           # requireRole(), getSessionRole()
└── audit.ts                          # logAudit()
docs/
├── DEPLOYMENT_GUIDE.md               # Deployment + infrastructure config
├── ROLE_SETUP_INSTRUCTIONS.md        # Clerk role assignment
├── blueprint.md                      # Architecture reference
└── agent.md                          # Developer persona + lessons learned
```

## Roles

| Role | How to assign | Access |
|---|---|---|
| _(none)_ | Default for new users | Dashboard + submit only |
| `TRIAGER` | Set in Clerk publicMetadata | Admin panel — view & triage |
| `ADMIN` | Set in Clerk publicMetadata | Full admin access |

See [docs/ROLE_SETUP_INSTRUCTIONS.md](docs/ROLE_SETUP_INSTRUCTIONS.md) for step-by-step instructions.
migrations/
└── 0001_schema.sql                   # D1: reports + audit_logs tables
```

## Pending Cleanup

```bash
# Remove unused AWS SDK (R2 was removed — these packages are dead weight)
npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner --legacy-peer-deps

# Also safe to delete: lib/r2.ts, app/api/submit-report/route.ts
# Also safe to remove: [[r2_buckets]] block in wrangler.toml
```

## 🚀 Roadmap

### Planned Features

**Advanced Reporting & Analytics**
- [ ] Export filtered/sorted table data to CSV
- [ ] Custom date range analytics
- [ ] Report templates
- [ ] Automated weekly/monthly reports

**Notification System**
- [ ] Email notifications for report status changes
- [ ] In-app notification center
- [ ] Webhook integrations for external tools
- [ ] Slack/Discord notifications

**Enhanced Collaboration**
- [ ] Internal notes on reports (staff-only)
- [ ] @mentions in comments
- [ ] Report assignment notifications
- [ ] Team activity feed

**Security & Compliance**
- [ ] Two-factor authentication
- [ ] Audit log export
- [ ] GDPR compliance tools
- [ ] Data retention policies

**Researcher Experience**
- [ ] Report drafts (save before submit)
- [ ] Duplicate detection
- [ ] Report templates for common vulnerabilities
- [ ] Submission wizard/guide

**Triage Workflow**
- [ ] Bulk actions (assign/close multiple reports)
- [ ] Custom report labels/tags
- [ ] Saved filters
- [ ] Quick actions menu
- [ ] Bounty/reward tracking
- [ ] CVE/advisory linking

**Integration & API**
- [ ] Public API for researchers
- [ ] Jira/GitHub issue integration
- [ ] Custom webhooks
- [ ] API documentation

**Dashboard Enhancements**
- [ ] Customizable widgets
- [ ] Real-time updates (WebSocket)
- [ ] Dark mode
- [ ] Keyboard shortcuts

### Recently Completed

**v2.5.0 (May 16, 2026)**
- ✅ Complete Hall of Fame system with leaderboard and hacktivity
- ✅ Time period filtering (All Time, This Month, This Year)
- ✅ Visibility management with search and pagination
- ✅ Auto-award points system
- ✅ Points configuration interface
- ✅ Title redaction for privacy
- ✅ Edge runtime compatibility fixes

**v2.4.0 (May 15, 2026)**
- ✅ Modern table features (search, sort, pagination)
- ✅ User management improvements
- ✅ Search bar text color fix
- ✅ Audit log cleanup

**v2.3.0 (May 15, 2026)**
- ✅ Analytics dashboard
- ✅ Comments system
- ✅ Markdown rendering
- ✅ Report detail views

**v2.2.0 and earlier**
- ✅ Core platform features
- ✅ Role-based access control
- ✅ Scope management
- ✅ Triage workflow

## License

Part of Vanguard VDP's public security transparency programme. All content is public domain unless otherwise specified.

## Contact

Security issues: [security@vanguardvdp.ph](mailto:security@vanguardvdp.ph)

### ⚠️ Before First Deployment

1. Create D1 database: `wrangler d1 create vanguard-security`
2. Paste returned `database_id` into `wrangler.toml`
3. Run local migration: `npm run db:migrate:local`
4. Run remote migration: `npm run db:migrate:remote`
5. Set env vars in `.env` and Cloudflare dashboard:
   - `ENCRYPTION_KEY` → `openssl rand -hex 32`
   - `CLERK_SECRET_KEY` → from Clerk dashboard
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → from Clerk dashboard
   - `DISCORD_WEBHOOK_URL` → optional
6. Deploy: `npm run deploy`
7. Set Clerk redirect URLs in Clerk dashboard to the deployed Pages domain
