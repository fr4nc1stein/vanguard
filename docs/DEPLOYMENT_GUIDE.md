# Deployment Guide

Complete reference for deploying Vanguard VDP on Cloudflare Workers with Clerk auth and D1 database.

---

## Architecture Overview

```
Browser
  └── vanguard.laet4x.com (custom domain)
        └── Cloudflare Workers (vanguard-vdp)
              ├── Next.js app via @opennextjs/cloudflare
              ├── Cloudflare D1 (vanguard-security) — SQLite database
              └── Clerk v7 — authentication & session management
```

**Key URLs**
| Environment | URL |
|---|---|
| Production Worker | https://vanguard-vdp.fr4nc1stein.workers.dev |
| Custom Domain | https://vanguard.laet4x.com |
| Admin Panel | /admin |
| Clerk Dashboard | https://dashboard.clerk.com |
| Cloudflare Dashboard | https://dash.cloudflare.com |

---

## 1. Cloudflare Setup

### Worker

The app is deployed as a Cloudflare **Worker** (not Pages) using `@opennextjs/cloudflare`.

**`wrangler.toml` key settings:**
```toml
name = "vanguard-vdp"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
main = ".open-next/worker.js"
assets = { directory = ".open-next/assets" }
```

> **Why Worker and not Pages?** `@opennextjs/cloudflare` v1+ outputs a `worker.js` bundle, not a Pages Functions directory. The `wrangler.toml` must use `main =` instead of `pages_build_output_dir`.

### D1 Database

| Setting | Value |
|---|---|
| Name | `vanguard-security` |
| UUID | `9920df77-b7fa-4846-9e81-6e77c13ec8e6` |
| Binding | `DB` |

**Apply schema to remote DB:**
```bash
npx wrangler d1 execute vanguard-security --remote --file=migrations/0001_schema.sql --yes
```

### Worker Secrets

Set these via `wrangler secret put` (never in `wrangler.toml`):

```bash
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler secret put NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
npx wrangler secret put ENCRYPTION_KEY
```

`ENCRYPTION_KEY` must be 64 hex characters:
```bash
openssl rand -hex 32
```

### Observability

Logs and traces are enabled in `wrangler.toml`:
```toml
[observability.logs]
enabled = true
persist = true
invocation_logs = true

[observability.traces]
enabled = true
persist = true
```

View live logs:
```bash
npx wrangler tail vanguard-vdp --format pretty
```

---

## 2. Clerk Setup

### Application Settings

Go to **Clerk Dashboard → Configure → Paths** and set:

| Setting | Value |
|---|---|
| Sign-in URL | `/sign-in` |
| Sign-up URL | `/sign-up` |
| After sign-in URL | `/dashboard` |
| After sign-up URL | `/dashboard` |
| After sign-out URL | `/` |

### Allowed Redirect Origins

Go to **Clerk Dashboard → Configure → Domains** and add:
- `https://vanguard-vdp.fr4nc1stein.workers.dev`
- `https://vanguard.laet4x.com`

### User Roles

Roles are stored in Clerk's `publicMetadata`. Valid values:

| Role | Access |
|---|---|
| _(not set)_ | Dashboard + submit reports only |
| `USER` | Same as above (explicit) |
| `TRIAGER` | Admin panel — view, triage, comment on reports |
| `ADMIN` | Full admin — all TRIAGER actions + status changes |

> **Security note:** `publicMetadata` is **server-side only**. It can only be written via the Clerk Dashboard or your backend (using the secret key). Users cannot read or modify their own `publicMetadata` from the client — making it safe to use for role enforcement.

**To assign a role:**
1. Go to **Clerk Dashboard → Users**
2. Find the user → click their name
3. Scroll to **Metadata → Public** section
4. Set:
```json
{ "role": "ADMIN" }
```
5. Save, then have the user sign out and back in (session cache must refresh)

> See [ROLE_SETUP_INSTRUCTIONS.md](ROLE_SETUP_INSTRUCTIONS.md) for full detail.

### Production Keys

Production keys are scoped to `vanguard.laet4x.com`. They look like:
- Publishable key: `pk_live_Y2xlcmsud...`
- Secret key: `sk_live_DtOP5...`

These must be set in both `.env.local` (for builds) and as Worker secrets (for runtime).

---

## 3. Google OAuth (Optional)

To enable Google sign-in through Clerk:

### Google Cloud Console
1. Go to https://console.cloud.google.com → **APIs & Services → Credentials**
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add Authorized Redirect URI:
   ```
   https://clerk.vanguard.laet4x.com/v1/oauth_callback
   ```
4. Copy the Client ID and Client Secret

### Clerk Dashboard
1. Go to **Configure → Social Connections → Google**
2. Enable Google
3. Paste Client ID and Client Secret
4. Save

---

## 4. Environment Variables

### `.env.local` (build-time, NOT committed)
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
ENCRYPTION_KEY=<64 hex chars>
```

### Worker Secrets (runtime)
The same three variables above must also be pushed as Worker secrets via `wrangler secret put`.

> **Critical:** `.env.local` overrides `.env` during `next build`. If `.env.local` contains a dev (`pk_test_`) key, it gets baked into the bundle even if `.env` has the correct production key. Always keep `.env.local` in sync with production keys.

---

## 5. Deploy

```bash
npm run deploy
```

This runs: `opennextjs-cloudflare build && wrangler deploy`

Build output is in `.open-next/worker.js` and `.open-next/assets/`.

---

## 6. Custom Domain

To route `vanguard.laet4x.com` to the Worker:

1. **Cloudflare Dashboard → Workers & Pages → vanguard-vdp → Settings → Triggers**
2. Add Custom Domain: `vanguard.laet4x.com`
3. Cloudflare automatically provisions SSL (may take a few minutes)
4. Once active, also add this origin to Clerk's allowed redirect origins

---

## 7. Common Issues & Fixes

### `TypeError: Cannot read properties of undefined (reading 'default')`
- **Cause:** `export const runtime = 'edge'` on page files or API routes.
- **Fix:** Remove `export const runtime = 'edge'` from all `page.tsx` files. API `route.ts` files also do not need it with `@opennextjs/cloudflare` — the wrapper handles everything.
- **Rule:** Never set `export const runtime = 'edge'` on any file. The opennextjs cloudflare-node wrapper handles the runtime.

### Dev Clerk key baked into production bundle
- **Cause:** `.env.local` had `pk_test_*` key overriding `.env` during build.
- **Fix:** Ensure `.env.local` uses `pk_live_*` production key.
- **How to verify:** After build, check `.open-next/worker.js` and search for `clerk.accounts.dev` — it should not appear.

### D1 `DB` binding not found
- **Cause:** Wrong database UUID in `wrangler.toml`, or schema not applied.
- **Fix:** Verify UUID matches the actual D1 database ID in Cloudflare dashboard. Re-apply schema with `wrangler d1 execute ... --remote`.

### After login redirects to `vanguard.laet4x.com/sign-in#/sso-callback`
- **Cause:** Clerk redirect URLs not configured, or app URL not in allowed origins.
- **Fix:** Set After sign-in URL in Clerk dashboard. Add Worker URL to allowed redirect origins.

### Admin link visible but clicking it redirects back to `/`
- **Cause:** Clerk's session JWT does not include `publicMetadata` by default. The header uses `useUser()` (live Clerk API) so it shows the link correctly, but middleware was reading `sessionClaims?.publicMetadata` from the JWT — which is always `undefined` — so the role check always failed.
- **Fix:** Middleware now uses `clerkClient().users.getUser(userId)` to read live `publicMetadata` directly from the Clerk API, bypassing the JWT entirely.

### Admin accessible to all signed-in users
- **Cause:** Middleware only checked `auth.protect()` (any authenticated user), not role.
- **Fix:** Middleware now reads `publicMetadata.role` via `clerkClient` and redirects to `/` if not `ADMIN` or `TRIAGER`. New users have no role by default — admin is inaccessible until explicitly granted.

### Google OAuth `Error 400: invalid_request — Missing required parameter: client_id`
- **Cause:** Google OAuth credentials not configured in Clerk Social Connections.
- **Fix:** Create OAuth app in Google Cloud Console, add the callback URI, paste credentials into Clerk → Configure → Social Connections → Google.
