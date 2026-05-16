# Vanguard VDP

A HackerOne-style vulnerability disclosure platform. Security researchers sign in, submit encrypted reports, and track resolution status. Staff triage reports through a role-protected admin panel.

**Live:** https://vanguard.laet4x.com

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) | Full deployment, Cloudflare/Clerk/Google setup, common fixes |
| [docs/ROLE_SETUP_INSTRUCTIONS.md](docs/ROLE_SETUP_INSTRUCTIONS.md) | How to assign ADMIN/TRIAGER roles in Clerk |
| [docs/blueprint.md](docs/blueprint.md) | Architecture, data model, API surface, security design |
| [docs/agent.md](docs/agent.md) | Developer persona — stack rules, failure modes, code patterns |
| [ISSUES.md](ISSUES.md) | Known issues, edge runtime pitfalls, debugging tips |
| [docs/ADMIN_FEATURES.md](docs/ADMIN_FEATURES.md) | Admin features roadmap and specifications |

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

## Features

### Core Features
- **Submit reports** — authenticated, AES-GCM-256 encrypted, stored in D1
- **Researcher dashboard** — list own submissions with status badges (detail view and comments not yet built)
- **Triage workflow** (`/triage`) — role-gated (TRIAGER/ADMIN), full audit log, status management
- **Hall of Fame** — public recognition of accepted researchers
- **Security policy** — responsible disclosure guidelines and in-scope targets

### Admin Features (Phase 1 - Completed)
- **User Management** (`/admin/users`) — list all Clerk users, promote/demote roles (USER ↔ TRIAGER ↔ ADMIN)
- **Scope Management** (`/admin/scope`) — dynamically manage in-scope targets (add/edit/delete)
- **Route Separation** — `/triage` for report workflow, `/admin` for platform management

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

## Roadmap

Features that are planned or partially built but not yet complete.

### My Reports (Researcher Dashboard)

- **Report listing works** — authenticated researchers can see a list of their own submissions with status badges
- **Report detail view not built** — clicking a report does not open a detail page; researchers cannot view the full contents of their own submission
- **Researcher comments not built** — researchers cannot post follow-up comments or replies on their own reports (e.g. to provide additional PoC details or respond to a triager)

### Admin Panel

- **Report listing not working** — researchers can submit reports but the admin panel does not yet list them correctly; the listing view is broken/incomplete
- **Triage actions not wired up** — status changes (accept, reject, close, duplicate) are present in the UI but not fully functional end-to-end
- **Report detail view** — admin `/admin/reports/[id]` page needs polish and working triage actions
- **Add/manage scope targets** — admins should be able to add, edit, and remove in-scope targets (currently hardcoded in `lib/validation.ts` and `app/submit/page.tsx`)
- **Severity classification** — allow admins to set a severity level (Critical / High / Medium / Low / Informational) when triaging
- **Bounty/reward tracking** — record and display reward amounts tied to resolved reports
- **Researcher communication** — ability to leave comments or send messages to the submitting researcher directly from the admin panel
- **Bulk actions** — mark multiple reports at once (e.g. bulk close, bulk assign)
- **Assign to triager** — assign a specific report to a named triager for ownership
- **CVE / advisory linking** — attach a CVE ID or public advisory URL to a resolved report
- **Export** — download reports as CSV or JSON for audit purposes
- **Dashboard stats** — summary cards (open, in-progress, resolved, bounties paid) on the admin home page

### TRIAGER Role

- Role is defined and enforced in middleware but the TRIAGER-specific permission boundaries are not implemented — currently TRIAGER and ADMIN have identical access
- Intended scope: TRIAGERs can view and comment on reports, but cannot change status to `resolved` or `closed`, and cannot modify scope or settings

### Hall of Fame

- Currently static/sample data — real accepted researcher entries are not pulled from the database
- Should be populated automatically when a report is marked `accepted` or `resolved` by an admin
- Researcher handle, submission date, and optionally the CVE/advisory link should appear

### General UI

- Admin panel needs visual polish — table layout, pagination, and filter/search by status, severity, and date
- Mobile layout improvements on the admin panel and report detail page
- Email notifications to researchers when their report status changes

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
