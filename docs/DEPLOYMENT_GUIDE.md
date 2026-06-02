# Deployment Guide

Complete step-by-step guide for deploying Vanguard VDP from scratch on Cloudflare Workers with custom domain, Clerk authentication, and D1 database.

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
| Production Domain | https://vanguard.laet4x.com |
| Admin Panel | https://vanguard.laet4x.com/admin |
| Clerk Dashboard | https://dashboard.clerk.com |
| Cloudflare Dashboard | https://dash.cloudflare.com |

> **Note:** This guide uses a custom domain (`vanguard.laet4x.com`). The default `*.workers.dev` subdomain is not recommended for production use.

---

## Prerequisites

- **Node.js** 18+ and npm
- **Git** installed
- **Cloudflare account** with a domain added
- **Clerk account** (free tier works)
- **Terminal/Command line** access

---

## Step 1: Clone Repository & Install Dependencies

### 1.1 Clone the Repository

```bash
# Clone the repository
git clone https://github.com/fr4nc1stein/vanguard.git
cd vanguard
```

### 1.2 Install Dependencies

```bash
# Install all dependencies
npm install --legacy-peer-deps
```

> **Note:** The `--legacy-peer-deps` flag is required due to peer dependency conflicts in some packages.

### 1.3 Verify Installation

```bash
# Check if wrangler is available
npx wrangler --version

# Should output: ⛅️ wrangler 4.x.x
```

---

## Step 2: Prepare Environment Variables

### 2.1 Generate Encryption Key

First, generate a secure encryption key for AES-GCM-256:

```bash
openssl rand -hex 32
```

This will output a 64-character hex string. **Save this securely** - you'll need it for both local development and production.

### 2.2 Create Local Environment File

Copy the example environment file:

```bash
cp .env.example .env.local
```

### 2.3 Configure Environment Variables

Edit `.env.local` and add your values:

```env
# Clerk Authentication (get from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
CLERK_SECRET_KEY=sk_live_YOUR_SECRET_HERE

# Clerk Redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Application Encryption (use the key generated above)
ENCRYPTION_KEY=YOUR_64_CHARACTER_HEX_KEY_HERE
```

> **Important:** Never commit `.env.local` to git. It's already in `.gitignore`.

---

## Step 3: Cloudflare Setup

### 3.1 Login to Cloudflare

```bash
npx wrangler login
```

This will open a browser window to authenticate with Cloudflare.

### 3.2 Verify Wrangler Configuration

The repository includes a pre-configured `wrangler.toml` file:

```toml
name = "vanguard-vdp"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
main = ".open-next/worker.js"
assets = { directory = ".open-next/assets" }
```

**Key Points:**
- The app is deployed as a Cloudflare **Worker** (not Pages)
- Uses `@opennextjs/cloudflare` for Next.js compatibility
- Worker name: `vanguard-vdp` (you can change this if needed)

### 3.3 Create D1 Database

Create a new D1 database for the application:

```bash
npx wrangler d1 create vanguard-security
```

This will output:
```
✅ Successfully created DB 'vanguard-security'

[[d1_databases]]
binding = "DB"
database_name = "vanguard-security"
database_id = "<YOUR-DATABASE-UUID>"
```

**Important:** Copy the `database_id` and update it in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "vanguard-security"
database_id = "YOUR-DATABASE-UUID-HERE"  # Replace with your actual UUID
```

### 3.4 Apply Database Migrations

Apply all migrations in order for a fresh database:

```bash
npx wrangler d1 execute vanguard-security --remote --file=migrations/0001_schema.sql
npx wrangler d1 execute vanguard-security --remote --file=migrations/003_create_scopes_table.sql
npx wrangler d1 execute vanguard-security --remote --file=migrations/004_create_comments_table.sql
npx wrangler d1 execute vanguard-security --remote --file=migrations/0005_hall_of_fame.sql
npx wrangler d1 execute vanguard-security --remote --file=migrations/0006_response_templates.sql
npx wrangler d1 execute vanguard-security --remote --file=migrations/0007_remove_stored_names.sql
npx wrangler d1 execute vanguard-security --remote --file=migrations/0008_add_title_disclosed.sql
npx wrangler d1 execute vanguard-security --remote --file=migrations/0009_add_internal_flags.sql
npx wrangler d1 execute vanguard-security --remote --file=migrations/0010_convert_assigned_to_user_ids.sql
npx wrangler d1 execute vanguard-security --remote --file=migrations/0011_support_user_audit_logs.sql
npx wrangler d1 execute vanguard-security --remote --file=migrations/0012_scope_enhancements.sql
npx wrangler d1 execute vanguard-security --remote --file=migrations/0013_hof_enhancements.sql
npx wrangler d1 execute vanguard-security --remote --file=migrations/0014_researcher_features.sql
```

Run data maintenance scripts only after the schema migrations they depend on:

```bash
npx wrangler d1 execute vanguard-security --remote --file=migrations/backfill_hall_of_fame.sql
npx wrangler d1 execute vanguard-security --remote --file=migrations/redact_existing_pii.sql
```

> **Adding new migrations:** Use four-digit zero-padded prefixes starting at `0015_` and keep `lib/db/schema.ts` aligned with the resulting schema.

### 3.5 Verify Database

```bash
# List all tables
npx wrangler d1 execute vanguard-security --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

You should see tables like: `reports`, `audit_logs`, `comments`, `scopes`, `hall_of_fame`, etc.

### 3.6 Set Worker Secrets

Secrets are environment variables that are encrypted and only available at runtime. **Never put secrets in `wrangler.toml`**.

```bash
# Set Clerk secret key
npx wrangler secret put CLERK_SECRET_KEY
# Paste your sk_live_... key when prompted

# Set Clerk publishable key
npx wrangler secret put NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# Paste your pk_live_... key when prompted

# Set encryption key
npx wrangler secret put ENCRYPTION_KEY
# Paste your 64-character hex key when prompted
```

> **Tip:** You can verify secrets are set with: `npx wrangler secret list`

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

## Step 4: Clerk Setup

### Application Settings

Go to **Clerk Dashboard → Configure → Paths** and set:

| Setting | Value |
|---|---|
| Sign-in URL | `/sign-in` |
| Sign-up URL | `/sign-up` |
| After sign-in URL | `/dashboard` |
| After sign-up URL | `/dashboard` |
| After sign-out URL | `/` |

### 4.3 Configure Allowed Redirect Origins

Go to **Clerk Dashboard → Configure → Domains** and add your custom domain:

- `https://vanguard.laet4x.com` (or your custom domain)

> **Note:** Do NOT use the `*.workers.dev` subdomain in production. Always use your custom domain.

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

**Important:** The role value must be exactly `"ADMIN"` — all caps, in quotes. Lowercase (`"admin"`) will not work.

**Via Clerk API (alternative):**
```bash
curl -X PATCH https://api.clerk.com/v1/users/YOUR_USER_ID \
  -H "Authorization: Bearer YOUR_CLERK_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"public_metadata": {"role": "ADMIN"}}'
```

**Troubleshooting role issues:**
- Still getting 403 after setting role → sign out and back in (role is cached in session)
- Role shows as `undefined` in logs → check Clerk dashboard — metadata must be in **Public** tab, not Private
- Metadata shows correct role but still 403 → clear browser cookies and sign in again

### Production Keys

Production keys are scoped to `vanguard.laet4x.com`. They look like:
- Publishable key: `pk_live_Y2xlcmsud...`
- Secret key: `sk_live_DtOP5...`

These must be set in both `.env.local` (for builds) and as Worker secrets (for runtime).

---

## Step 5: Custom Domain & DNS Setup

### 5.1 Add Domain to Cloudflare

If your domain isn't already on Cloudflare:

1. Go to **Cloudflare Dashboard → Add a Site**
2. Enter your domain (e.g., `laet4x.com`)
3. Select a plan (Free works fine)
4. Follow the instructions to update your domain's nameservers
5. Wait for DNS propagation (can take up to 48 hours, usually much faster)

### 5.2 Configure DNS Records

Once your domain is active on Cloudflare:

1. Go to **Cloudflare Dashboard → DNS → Records**
2. You'll add a CNAME record for your subdomain in the next step

> **Note:** The Worker custom domain feature will automatically create the necessary DNS records.

### 5.3 Add Custom Domain to Worker

1. Go to **Cloudflare Dashboard → Workers & Pages**
2. Click on your worker (`vanguard-vdp`)
3. Go to **Settings → Triggers**
4. Under **Custom Domains**, click **Add Custom Domain**
5. Enter your domain: `vanguard.laet4x.com` (or your subdomain)
6. Click **Add Custom Domain**

Cloudflare will:
- ✅ Automatically create DNS records
- ✅ Provision SSL certificate (takes 1-5 minutes)
- ✅ Route traffic to your Worker

### 5.4 Verify DNS Configuration

After adding the custom domain, verify the DNS records:

1. Go to **Cloudflare Dashboard → DNS → Records**
2. You should see a new record:
   - **Type:** CNAME
   - **Name:** vanguard (or your subdomain)
   - **Target:** vanguard-vdp.fr4nc1stein.workers.dev (auto-generated)
   - **Proxy status:** Proxied (orange cloud)

### 5.5 Test Custom Domain

Wait 1-2 minutes for SSL provisioning, then test:

```bash
curl -I https://vanguard.laet4x.com
```

You should see:
```
HTTP/2 200
server: cloudflare
...
```

> **Troubleshooting:** If you get SSL errors, wait a few more minutes. SSL certificate provisioning can take up to 15 minutes.

---

## Step 6: Google OAuth (Optional)

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


## Step 7: Build and Deploy

### 7.1 Build the Application

```bash
npm run build
```

This will:
- Build the Next.js application
- Generate the OpenNext bundle
- Output to `.open-next/` directory

### 7.2 Deploy to Cloudflare

```bash
npm run deploy
```

This runs: `opennextjs-cloudflare build && wrangler deploy`

You should see:
```
✨ Success! Uploaded vanguard-vdp (X.XX sec)
Deployed vanguard-vdp triggers (X.XX sec)
  https://vanguard.laet4x.com
Current Version ID: <version-id>
```

### 7.3 Verify Deployment

Visit your custom domain:
```
https://vanguard.laet4x.com
```

You should see the Vanguard VDP homepage.

---


## Step 8: Post-Deployment Configuration

### 8.1 Update Clerk Redirect URLs

Now that your custom domain is live, update Clerk:

1. Go to **Clerk Dashboard → Configure → Domains**
2. Ensure `https://vanguard.laet4x.com` is in the allowed redirect origins
3. Remove any `*.workers.dev` URLs if present

### 8.2 Assign Admin Role

To access the admin panel, you need to assign yourself the ADMIN role:

1. Go to **Clerk Dashboard → Users**
2. Find your user account
3. Click on your name
4. Scroll to **Metadata → Public**
5. Add:
   ```json
   { "role": "ADMIN" }
   ```
6. Save
7. Sign out and sign back in to refresh your session

### 8.3 Test Admin Access

Visit:
```
https://vanguard.laet4x.com/admin
```

You should see the admin dashboard.

---

## Step 9: Common Issues & Fixes

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

---

## Step 10: Data Deletion (GDPR / Right to Erasure)

### Find the User's Clerk ID

```bash
npx wrangler d1 execute vanguard-security --remote --command="SELECT DISTINCT actor_id, actor_email FROM audit_logs WHERE actor_email = 'user@example.com' LIMIT 1;"
```

### Delete All User Data from D1

Run in this order to avoid foreign key constraint errors:

```bash
USER="user_CLERK_ID_HERE"
EMAIL="user@example.com"

npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM comments WHERE author_id = '$USER';"
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM researcher_stats WHERE researcher_id = '$USER';"
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM hall_of_fame WHERE researcher_id = '$USER';"
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM hacktivity WHERE researcher_id = '$USER';"
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM report_drafts WHERE clerk_user_id = '$USER';"
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM comments WHERE report_id IN (SELECT id FROM reports WHERE clerk_user_id = '$USER');"
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM audit_logs WHERE report_id IN (SELECT id FROM reports WHERE clerk_user_id = '$USER');"
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM audit_logs WHERE actor_id = '$USER' OR actor_email = '$EMAIL';"
npx wrangler d1 execute vanguard-security --remote --command="DELETE FROM reports WHERE clerk_user_id = '$USER';"
```

### Verify Deletion

```bash
npx wrangler d1 execute vanguard-security --remote --command="
SELECT
  (SELECT COUNT(*) FROM reports WHERE clerk_user_id = '$USER') as reports,
  (SELECT COUNT(*) FROM audit_logs WHERE actor_id = '$USER') as audit_logs,
  (SELECT COUNT(*) FROM comments WHERE author_id = '$USER') as comments,
  (SELECT COUNT(*) FROM hall_of_fame WHERE researcher_id = '$USER') as hall_of_fame,
  (SELECT COUNT(*) FROM researcher_stats WHERE researcher_id = '$USER') as researcher_stats,
  (SELECT COUNT(*) FROM report_drafts WHERE clerk_user_id = '$USER') as drafts;
"
```

All counts should be `0`.

### Delete from Clerk

Go to **Clerk Dashboard → Users → [user] → Delete user**, or:

```bash
curl -X DELETE "https://api.clerk.com/v1/users/$USER" \
  -H "Authorization: Bearer YOUR_CLERK_SECRET_KEY"
```

> **Note:** This satisfies GDPR Right to Erasure. Ensure database backups are also purged per your retention policy.
