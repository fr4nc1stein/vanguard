# Vanguard VDP — Architecture Blueprint

## Overview

A HackerOne-style vulnerability disclosure platform for Vanguard VDP. Researchers sign in, submit reports, and track status. Staff triage reports through a protected admin panel. All sensitive data is encrypted at rest.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.5 (App Router) |
| Runtime | Cloudflare Workers via `@opennextjs/cloudflare` |
| Hosting | Cloudflare Pages |
| Database | Cloudflare D1 (SQLite) |
| ORM | Drizzle ORM (`drizzle-orm/d1`) |
| Auth | Clerk v7 (`@clerk/nextjs`) |
| Encryption | Web Crypto API — AES-GCM-256 |
| Styling | Tailwind CSS |
| Validation | Zod v4 |
| Language | TypeScript (strict) |

---

## Cloudflare Bindings

| Binding | Type | Name | Purpose |
|---------|------|------|---------|
| `DB` | D1 Database | `vanguard-security` | All report & audit data |

> R2 was intentionally removed. File uploads are disabled (410). Researchers paste evidence links instead.

---

## Project Structure

```
vanguard-vdp/
├── app/
│   ├── page.tsx                        # Home — Security Policy
│   ├── layout.tsx                      # Root layout + ClerkProvider
│   ├── hall-of-fame/page.tsx           # Public Hall of Fame
│   ├── submit/page.tsx                 # Submit form (auth required)
│   ├── dashboard/page.tsx              # Researcher's report list
│   ├── triage/page.tsx                 # Triage queue (TRIAGER/ADMIN)
│   ├── triage/reports/[id]/page.tsx    # Report detail + triage
│   ├── admin/page.tsx                  # Admin console (ADMIN)
│   ├── sign-in/[[...sign-in]]/page.tsx # Clerk sign-in (catch-all)
│   ├── sign-up/[[...sign-up]]/page.tsx # Clerk sign-up (catch-all)
│   ├── components/
│   │   ├── SiteHeader.tsx              # Nav + Clerk user button
│   │   ├── SiteFooter.tsx
│   │   ├── ReportStatusBadge.tsx
│   │   └── AuditLogTimeline.tsx
│   └── api/
│       ├── reports/route.ts            # POST (submit) + GET (list own)
│       ├── reports/[id]/route.ts       # GET single report
│       ├── admin/reports/route.ts      # GET all reports (admin)
│       ├── admin/reports/[id]/status/route.ts  # PATCH triage action
│       ├── admin/stats/route.ts        # GET dashboard stats
│       └── upload/presign/route.ts     # DISABLED — returns 410
├── lib/
│   ├── db/
│   │   ├── index.ts                    # getDb(), getCfEnv()
│   │   └── schema.ts                   # Drizzle table definitions
│   ├── crypto.ts                       # AES-GCM-256 encrypt/decrypt + SHA-256 hash
│   ├── validation.ts                   # Zod schemas (ReportSubmitSchema, TriageUpdateSchema)
│   ├── auth.ts                         # requireRole(), getSessionRole()
│   └── audit.ts                        # logAudit()
├── migrations/
│   ├── 0001_schema.sql                 # Base D1 schema: reports + audit_logs
│   ├── 003_create_scopes_table.sql     # Dynamic scope targets
│   ├── 004_create_comments_table.sql   # Researcher/staff comments
│   ├── 0011_support_user_audit_logs.sql # User/system audit entities
│   ├── 0012_scope_enhancements.sql     # Scope restrictions + archive support
│   └── 0005+                           # Hall of Fame, templates, privacy, flags
├── middleware.ts                       # Clerk auth — protects /admin, /dashboard, /submit
├── instrumentation.ts                  # setupDevPlatform() for local dev (Node runtime only)
├── wrangler.toml                       # CF Pages config + D1 binding
├── next.config.ts                      # Next.js config + serverExternalPackages
└── .npmrc                              # legacy-peer-deps=true (needed for CF build tool)
```

---

## Database Schema

### `reports`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUIDv4 |
| `ref_id` | TEXT UNIQUE | VVDP-[S]-YYYY-XXXXXXXX (public reference) |
| `handle` | TEXT | Researcher handle (optional) |
| `email_encrypted` | TEXT | AES-GCM ciphertext |
| `email_iv` | TEXT | IV for email decryption |
| `target` | TEXT | Affected platform |
| `vuln_type` | TEXT | Vulnerability category |
| `severity` | TEXT | Critical/High/Medium/Low/Info |
| `title` | TEXT | Report title (plaintext) |
| `body_encrypted` | TEXT | AES-GCM: description + steps + impact + evidence |
| `body_iv` | TEXT | IV for body decryption |
| `cvss` | TEXT | CVSS string (optional) |
| `status` | TEXT | new/triaged/accepted/rejected/fixed/informational |
| `assigned_to` | TEXT | Clerk user ID of triager |
| `poc_files` | TEXT | JSON array (empty — R2 removed) |
| `clerk_user_id` | TEXT | Clerk user ID of submitter |
| `ip_hash` | TEXT | SHA-256(IP) — privacy-preserving |
| `submitted_at` | INTEGER | Unix ms |
| `updated_at` | INTEGER | Unix ms |

### `audit_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUIDv4 |
| `report_id` | TEXT FK, nullable | → reports.id for report-scoped logs; null for user/system logs |
| `entity_type` | TEXT | report / user / system |
| `entity_id` | TEXT | ID of the audited entity |
| `actor_id` | TEXT | Clerk user ID |
| `actor_email` | TEXT | Display only |
| `action` | TEXT | report_submitted / status_changed / etc. |
| `old_value` | TEXT | Previous value |
| `new_value` | TEXT | New value |
| `ip_hash` | TEXT | SHA-256(IP) |
| `is_internal` | INTEGER | 0 = public, 1 = staff-only |
| `timestamp` | INTEGER | Unix ms |

### `scopes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUIDv4 |
| `domain` | TEXT | Target domain or URL |
| `description` | TEXT | Admin-facing target description |
| `target_type` | TEXT | web_app / api / mobile / infrastructure |
| `status` | TEXT | active / deprecated / out_of_scope |
| `allowed_vuln_types` | TEXT | JSON array; null means all vulnerability types are allowed |
| `severity_restriction` | TEXT | JSON array; null means all severities are allowed |
| `notes` | TEXT | Researcher-facing target guidance |
| `exclusion_paths` | TEXT | Researcher-facing out-of-scope paths/rules |
| `deleted_at` | INTEGER | Null for live targets; Unix ms when archived |
| `created_by` | TEXT | Clerk user ID |
| `created_at` | INTEGER | Unix ms |
| `updated_at` | INTEGER | Unix ms |

### `report_drafts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUIDv4 |
| `clerk_user_id` | TEXT UNIQUE | One active draft per signed-in researcher |
| `data` | TEXT | AES-GCM ciphertext containing JSON draft fields |
| `data_iv` | TEXT | IV for draft decryption |
| `created_at` | INTEGER | Unix ms |
| `updated_at` | INTEGER | Unix ms |

### `researcher_stats`

| Column | Type | Notes |
|--------|------|-------|
| `researcher_id` | TEXT PK | Clerk user ID |
| `total_points` | INTEGER | Aggregated Hall of Fame points |
| `total_reports` | INTEGER | Total researcher reports |
| `accepted_reports` | INTEGER | Accepted/fixed Hall of Fame reports |
| `critical_count` / `high_count` / `medium_count` / `low_count` / `info_count` | INTEGER | Severity breakdown |
| `hof_opt_out` | INTEGER | 1 = hide from public Hall of Fame/profile/hacktivity surfaces |
| `updated_at` | INTEGER | Unix ms |

---

## Auth & Roles

Roles are set in Clerk `publicMetadata.role`:

| Role | Access |
|------|--------|
| *(any signed-in user)* | Submit reports, view own dashboard |
| `TRIAGER` | Admin panel, triage reports, change status |
| `ADMIN` | All triage actions + terminal state overrides |

Routes protected by `middleware.ts`:
- `/admin(.*)` — requires auth (role check in handler)
- `/api/admin(.*)` — requires auth (role check in handler)
- `/dashboard(.*)` — requires auth
- `/submit(.*)` — requires auth

---

## Security Design

### Encryption
- All sensitive report content (description, steps, impact, email) encrypted with **AES-GCM-256** before writing to D1
- Autosaved researcher drafts are encrypted with **AES-GCM-256** before writing to D1
- Key stored as `ENCRYPTION_KEY` env var (64 hex chars = 32 bytes)
- Each encryption generates a fresh random 96-bit IV (never reused)
- Only staff (TRIAGER/ADMIN) can decrypt report body — decryption is audit-logged

### IP Privacy
- Submitter IPs are **never stored in plaintext**
- Stored as `SHA-256(ip)` — rate-limiting-friendly but not reversible

### Input Validation
- All API inputs validated with **Zod** before processing
- Frontend validation mirrors server-side rules exactly (same min/max lengths) to prevent false success on 422 errors
- Report targets are checked against active records in the `scopes` table

### Headers & CSP
- Deployed on Cloudflare Pages which enforces HTTPS
- Do not set `export const runtime = 'edge'` in app files. The OpenNext Cloudflare wrapper handles the runtime.

---

## Local Development

### Fast UI work (no D1)
```bash
npm run dev        # next dev — hot reload, no CF bindings
```

### Full Cloudflare stack (D1 writes to local SQLite)
```bash
npm run dev:cf     # builds + wrangler pages dev with local D1
```
> Server runs at `http://localhost:8788`
> Data stored in `.wrangler/state/v3/d1/`

### Query local data
```bash
npx wrangler d1 execute vanguard-security --local --command="SELECT ref_id, title, status FROM reports"
```

### Query remote (production) data
```bash
npx wrangler d1 execute vanguard-security --remote --command="SELECT ref_id, title, status FROM reports"
```

---

## Deployment

```bash
npm run deploy
# Runs: npx @cloudflare/next-on-pages && wrangler pages deploy
# Output dir: .vercel/output/static
```

### Required environment variables (Cloudflare Pages → Settings → Variables)

| Variable | Notes |
|----------|-------|
| `ENCRYPTION_KEY` | 64-char hex — `openssl rand -hex 32` |
| `CLERK_SECRET_KEY` | From Clerk dashboard |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | From Clerk dashboard |
| `DISCORD_WEBHOOK_URL` | Optional — new report notifications |

### Required Clerk dashboard settings
- Sign-in URL: `https://<your-domain>/sign-in`
- Sign-up URL: `https://<your-domain>/sign-up`
- After sign-in redirect: `/dashboard`
- After sign-up redirect: `/dashboard`

---

## Production Status

✅ **System is production-ready** — All core features implemented and tested.

### Recent Updates (May 2026)

- ✅ Clerk authentication fully integrated with proper redirects
- ✅ Sign-in/Sign-up pages configured with `afterSignInUrl="/dashboard"`
- ✅ Root layout configured with `signInUrl="/sign-in"` and `signUpUrl="/sign-up"`
- ✅ Middleware protects all authenticated routes (`/admin`, `/dashboard`, `/submit`)
- ✅ Role-based access control (RBAC) enforced at middleware and API levels
- ✅ OpenNext Cloudflare runtime is configured centrally
- ✅ Encryption and audit logging fully operational
- ✅ VAN-13, VAN-14, VAN-16, VAN-17, and VAN-20 deployed surfaces live-smoke-tested on `https://vanguard.laet4x.com`
- ✅ Researcher drafts are encrypted at rest and Hall of Fame opt-out is enforced in public recognition surfaces

### Optional Cleanup Tasks

| Item | Detail | Priority |
|------|--------|----------|
| `middleware.ts` deprecation | Next.js 16 deprecates `middleware.ts` in favour of `proxy.ts` — Clerk doesn't fully support proxy convention yet, leave as-is | Low |
