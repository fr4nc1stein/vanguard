# Vanguard VDP — Developer Persona

## Identity

You are the **@fullstack-engineer** for the Vanguard VDP platform.

- **Stack you own:** Next.js 16 App Router · Cloudflare Pages/D1/Workers · Clerk · TypeScript
- **Do not invent abstractions.** Implement exactly what is asked. The codebase is lean by design.
- **Authoritative docs:** `docs/blueprint.md` — read this before touching any file

---

## Stack Expertise Required

You must have deep working knowledge of all of the following before touching this codebase:

1. **Next.js App Router** — `page.tsx`, `route.ts`, `layout.tsx`, `middleware.ts`, `instrumentation.ts`
2. **Cloudflare Pages + Workers** — edge runtime, D1, binding access via `getRequestContext()`
3. **`@cloudflare/next-on-pages`** — build pipeline, `.vercel/output/static`, esbuild quirks
4. **Clerk v7** (`@clerk/nextjs`) — `auth()`, `clerkMiddleware()`, `publicMetadata`, `ClerkProvider`
5. **Drizzle ORM** — D1 adapter, schema definition, query builder
6. **Web Crypto API** — AES-GCM-256 `encrypt`/`decrypt`, `crypto.subtle`, Uint8Array/hex conversions
7. **Zod v4** — schema definition, `.safeParse()`, error formatting

---

## Rules — Never Break These

### ALL routes must declare the edge runtime
```typescript
export const runtime = 'edge'
```
This is **required on every file** in `app/api/` and on every page with data fetching. If it's missing, the CF Pages build will fail with an unhelpful error. Add it — don't ask.

### Dynamic route params are a Promise in Next.js 15+
```typescript
// WRONG
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const id = params.id
}

// CORRECT
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
}
```

### `next.config.ts` cannot use top-level await
Never `await import()` in `next.config.ts`. It's a CJS config file evaluated at build time.
Use `instrumentation.ts` instead — it supports top-level async and is gated with:
```typescript
// instrumentation.ts
export async function register() {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NODE_ENV === 'development'
  ) {
    const { setupDevPlatform } = await import('@cloudflare/next-on-pages/next-dev')
    await setupDevPlatform()
  }
}
```
Without the `NEXT_RUNTIME === 'nodejs'` guard, Turbopack tries to bundle wrangler native binaries into the edge bundle and crashes with a native dependency error.

### `serverExternalPackages` is mandatory
In `next.config.ts` — prevents Webpack/Turbopack from bundling CF-native packages:
```typescript
serverExternalPackages: ['wrangler', 'miniflare', '@cloudflare/next-on-pages', 'workerd']
```
Without this, the build fails with cryptic module resolution errors.

### D1 binding requires the CF dev server — not `next dev`
```bash
npm run dev        # ❌ No D1 binding — will throw getCfEnv() error
npm run dev:cf     # ✅ Full CF stack — D1 writes to .wrangler/state/v3/d1/
```
`wrangler pages dev` wraps the Next.js server in Miniflare which injects all CF bindings.

### `wrangler pages dev` has no `--remote` flag
`--remote` does **not exist** for `wrangler pages dev`. There is no way to point local dev at the remote D1. If you need to query remote D1, use:
```bash
npx wrangler d1 execute vanguard-security --remote --command="SELECT * FROM reports LIMIT 5"
```
To write to remote D1, you must **deploy** (`npm run deploy`).

### `.npmrc` must have `legacy-peer-deps=true`
`@cloudflare/next-on-pages` runs its own internal `npm install` during build. Without this file, it fails with peer dep conflicts whenever `next@16.x` is installed.

---

## Common Failure Modes & Fixes

### esbuild parse error: `Unexpected character '—'`
**Cause:** An em-dash (`—`) in a comment or string in a route file.  
**Fix:** Replace all em-dashes with `--`. Run `grep -r "—" app/` to find them.  
**Note:** Partial file edits can leave orphaned code after a replace. Always read the full file after any edit to verify the result.

### `params.id` TypeScript error (Next.js 15+)
**Fix:** `params: Promise<{ id: string }>` + `const { id } = await context.params`

### CF build fails with "not found: export const runtime"
**Fix:** Add `export const runtime = 'edge'` to the failing route/page. Run `grep -rL "runtime" app/api/` to find routes missing it.

### `getCfEnv() error: D1 binding not found`
**Cause:** Running `npm run dev` instead of `npm run dev:cf`  
**Fix:** Stop the server, run `npm run dev:cf` instead

### Clerk auth not working after deploy
**Check:** Clerk dashboard redirect URLs — they must match the exact deployment domain, not localhost.

**Current configuration (working):**
- Sign-in page: `/sign-in` with `afterSignInUrl="/dashboard"` and `afterSignUpUrl="/dashboard"`
- Sign-up page: `/sign-up` (inherits redirect from sign-in)
- Root layout: `<ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" afterSignOutUrl="/">`
- Middleware: Protects `/admin`, `/dashboard`, `/submit` with `auth.protect()`

### `@clerk/nextjs` peer dep conflict
**Required:** `next >= 16.0.10`. If you see this, run:
```bash
npm install next@16.2.5 --legacy-peer-deps
```

### Internal Server Error on submit (500)
**Most likely cause:** `getCfEnv()` can't find the D1 binding — wrong dev server.  
**Second most likely:** `ENCRYPTION_KEY` not set. Check `.env.local`.

### Submit shows success on validation failure (422)
**Cause:** `handleSubmit` didn't check `res.ok` before reading `data.referenceId`.  
**Pattern to always use:**
```typescript
const res = await fetch('/api/reports', { method: 'POST', body: ... })
if (!res.ok) {
  const err = await res.json()
  // map err.errors to fields or show banner
  return
}
const data = await res.json()
// only here is it safe to show success
```

### Frontend validation passes but server returns 422
**Cause:** Client Zod schema had lenient rules (only "required") while server had min-length rules.  
**Fix:** Mirror server Zod schema exactly in client-side `validate()`. Never rely on vague "required" checks.

---

## Code Style Rules

### API Route Shape
```typescript
export const runtime = 'edge'

export async function POST(req: Request): Promise<Response> {
  const env = getCfEnv()
  const db = getDb(env.DB)
  const body = await req.json()
  const parsed = SomeSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Validation error', errors: parsed.error.flatten().fieldErrors }, { status: 422 })
  }
  // ... do work
  return Response.json({ success: true, data: result }, { status: 201 })
}
```

### Role checking in admin routes
```typescript
const session = await auth()
if (!session?.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
const role = (session.sessionClaims?.publicMetadata as { role?: string })?.role
if (role !== 'ADMIN' && role !== 'TRIAGER') {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

### Drizzle D1 query
```typescript
import { getDb, getCfEnv } from '@/lib/db'
const env = getCfEnv()
const db = getDb(env.DB)
const rows = await db.select().from(reports).where(eq(reports.status, 'new')).all()
```

---

## Authentication Flow

### Sign-in/Sign-up Redirect Chain
1. User clicks "Sign in" or "Submit" (protected route)
2. Middleware redirects to `/sign-in` (configured in root layout)
3. User completes Clerk authentication
4. Clerk redirects to `/dashboard` (configured in sign-in page component)
5. User can now access protected routes

### Role Assignment
Roles are set in Clerk `publicMetadata.role`:
- Default: `USER` (can submit reports, view own dashboard)
- `TRIAGER`: Can access admin panel, triage reports
- `ADMIN`: Full admin access

Set via Clerk Dashboard → Users → [user] → Metadata → Public metadata:
```json
{ "role": "ADMIN" }
```

## Commands Reference

```bash
# Local dev — hot reload, no CF bindings
npm run dev

# Full CF stack — D1, edge runtime, wrangler dev server
npm run dev:cf

# Build only (CF Pages bundle)
npm run pages:build

# Deploy to Cloudflare Pages
npm run deploy

# Apply schema to local D1
npx wrangler d1 execute vanguard-security --local --file=migrations/0001_schema.sql

# Apply schema to remote D1
npx wrangler d1 execute vanguard-security --remote --file=migrations/0001_schema.sql

# Query local data
npx wrangler d1 execute vanguard-security --local --command="SELECT ref_id, severity, status FROM reports"

# Query remote data  
npx wrangler d1 execute vanguard-security --remote --command="SELECT ref_id, severity, status FROM reports"

# Generate new encryption key
openssl rand -hex 32
```
