# Lessons Learned — Vanguard VDP

Patterns extracted from past mistakes, corrections, and bug fixes.
Add a new entry whenever you correct a mistake or get pushback.
Review the relevant section before starting a task in that domain.

---

## Cloudflare / Edge Runtime

**L01 — Never use `Zod.default()` in edge runtime**
`TypeError: Cannot read properties of undefined (reading 'default')` at runtime.
Use `.optional()` instead and handle defaults in application code:
```typescript
// ❌  z.coerce.number().default(1)
// ✅  z.coerce.number().optional()  →  const { page = 1 } = parsed.data
```
*Source: ISSUES.md §1, CHANGELOG.md v2.1.0*

**L02 — Never declare `export const runtime = 'edge'` in API routes**
OpenNext/Cloudflare already sets the runtime. Adding the declaration causes conflicts.
*Source: ISSUES.md §2, AGENTS.md, docs/blueprint.md*

**L03 — D1 binding requires `npm run dev:cf`, not `npm run dev`**
`npm run dev` is a plain Next.js server with no Cloudflare bindings.
Any code that calls `getCfEnv()` or accesses D1 will throw at runtime.
`npm run dev:cf` wraps the server in Miniflare, which injects all CF bindings.
*Source: AGENTS.md, docs/agent.md*

**L04 — `wrangler pages dev` has no `--remote` flag**
You cannot point local dev at production D1. To read/write remote D1 you must:
- Read: `npx wrangler d1 execute vanguard-security --remote --command="..."`
- Write: `npm run deploy`
*Source: docs/agent.md*

**L05 — `serverExternalPackages` is mandatory in `next.config.ts`**
Without it, Webpack/Turbopack tries to bundle CF-native packages and the build fails
with cryptic module resolution errors:
```typescript
serverExternalPackages: ['wrangler', 'miniflare', '@cloudflare/next-on-pages', 'workerd']
```
*Source: docs/agent.md*

**L06 — esbuild cannot parse em-dashes (`—`) in route files**
An em-dash in a comment or string produces `Unexpected character '—'` at build time.
Replace all `—` with `--` in any file under `app/api/`.
Run `grep -r "—" app/` before building if unsure.
*Source: docs/agent.md*

---

## Next.js 15+ / 16 Specifics

**L07 — Dynamic route params are a `Promise` in Next.js 15+**
```typescript
// ❌ Wrong — was valid in Next.js 14
export async function GET(req: Request, { params }: { params: { id: string } }) {

// ✅ Correct
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
```
*Source: docs/agent.md, CHANGELOG.md v2.3.0*

**L08 — No top-level await in `next.config.ts`**
It's a CJS file evaluated at build time. Async setup belongs in `instrumentation.ts`
and must be gated with `process.env.NEXT_RUNTIME === 'nodejs'` to prevent Turbopack
from bundling wrangler native binaries into the edge bundle.
*Source: docs/agent.md*

---

## Auth & Middleware

**L09 — API routes must not be blocked by middleware role checks**
Middleware should only guard page routes. API routes authenticate themselves via `requireRole()`.
```typescript
// ❌ const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)'])
// ✅ const isAdminPageRoute = createRouteMatcher(['/admin(.*)'])
//    if (isAdminPageRoute(req) && !req.nextUrl.pathname.startsWith('/api/')) { ... }
```
*Source: ISSUES.md §3, CHANGELOG.md v2.1.0*

**L10 — Report owners need to decrypt their own data, not just staff**
When the single-report API was first written, only TRIAGER/ADMIN could decrypt the body.
This caused researchers to get "Report not found" (effectively a 403) on their own reports.
The API must check `clerkUserId === report.clerk_user_id` as a second gate.
*Source: CHANGELOG.md v2.3.0*

---

## Database & Migrations

**L11 — Follow `docs/MIGRATION_ORDER.md` for migration order; don't rely on filenames**
Migration filenames were not consistently zero-padded in early history.
The canonical order is in `docs/MIGRATION_ORDER.md`. New migrations start at `0013_`.
*Source: docs/MIGRATION_ORDER.md*

**L12 — Code must never deploy before its migration runs**
Schema and code are coupled. Always run migrations on remote D1 before pushing code
that depends on the new columns or tables.
```bash
npx wrangler d1 execute vanguard-security --remote --file=migrations/XXXX.sql
```
*Source: ISSUES.md §DB, AGENTS.md*

**L13 — Don't store user names in the database; fetch from Clerk dynamically**
Stored names go stale when users update their profile in Clerk.
Use `clerk_user_id` as the key and fetch the display name at query time via the Clerk API.
Display name priority: alias → first+last → first → username → email prefix → `'Anonymous'`.
*Source: docs/SCHEMA_REFACTOR.md*

**L14 — Don't commit one-off migration files that contain user-specific data**
Email-to-user-ID conversion scripts are one-time operations; they contain PII and can't
be replayed. Create the file locally, execute it manually, then discard — do not `git add`.
*Source: docs/agent.md, AGENTS.md*

---

## API Design

**L15 — Mirror Zod schemas exactly between client and server**
If the server enforces `min(10)` but the client only checks "required", the form submits,
hits the server, returns 422, and the client shows success because it didn't check `res.ok`.
Always copy the exact min/max/enum constraints to the client-side `validate()` function.
*Source: docs/agent.md, CHANGELOG.md v2.3.0*

**L16 — Always check `res.ok` before reading the success payload**
```typescript
const res = await fetch('/api/reports', { method: 'POST', body: ... })
if (!res.ok) { /* handle error */ return }
const data = await res.json()  // only safe here
```
*Source: docs/agent.md*

**L17 — Verify the exact API response shape before wiring up the frontend**
`data.report` vs `data.data` vs plain array — a mismatch silently produces `undefined`
and shows an empty or broken UI. Check the route handler's `return Response.json(...)` call
before writing the consumer.
*Source: CHANGELOG.md v2.3.0*

---

## Security

**L18 — Never log PII to the console**
Email addresses, names, and report bodies must not appear in logs.
Log only non-sensitive identifiers: reference ID, severity, role, status.
```typescript
// ❌ console.log(`Email: ${body.email}`)
// ✅ console.log(`[REPORT] ${referenceId} | severity: ${body.severity}`)
```
*Source: CHANGELOG.md v2.0.0*

**L19 — Gate debug logs with `NODE_ENV === 'development'`**
Verbose auth/session logs running on every request pollute production logs and can
expose session token fragments.
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[getSessionRole] role:', role)
}
```
*Source: CHANGELOG.md v2.0.0*

**L20 — Sanitize LIKE query parameters to prevent SQL injection**
Drizzle's `like()` helper does not escape `%` and `_` in user input.
```typescript
const sanitized = q.replace(/[%_\\]/g, '\\$&')
conditions.push(like(reports.title, `%${sanitized}%`))
```
*Source: CHANGELOG.md v2.0.0*

---

## Route Changes

**L21 — When renaming a route, search the whole codebase for old references**
Navigation components, breadcrumbs, back buttons, Discord webhook URLs, and API response
links can all silently break.
```bash
grep -r "/old-route" app/ lib/ --include="*.ts" --include="*.tsx"
```
*Source: ISSUES.md §Route Restructuring*

---

## Development Workflow

**L22 — `npm run lint` has pre-existing failures; report them, don't treat them as blockers**
Lint failures that existed before your change are noise. Call them out explicitly
so the reviewer knows they are pre-existing.
*Source: AGENTS.md*

**L23 — `.npmrc` must have `legacy-peer-deps=true`**
`@cloudflare/next-on-pages` runs its own `npm install` internally during build.
Without `legacy-peer-deps=true`, peer dependency conflicts fail the CF build for `next@16.x`.
*Source: docs/agent.md*
