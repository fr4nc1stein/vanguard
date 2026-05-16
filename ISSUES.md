# Known Issues & Solutions - Vanguard VDP

This document tracks known issues, their root causes, and solutions to avoid repeating them in future development.

---

## 🚨 Critical Issues

### 1. Zod `.default()` Incompatibility with Cloudflare Workers Edge Runtime

**Issue:** `TypeError: Cannot read properties of undefined (reading 'default')`

**Root Cause:** Zod's `.default()` method doesn't work properly in Cloudflare Workers edge runtime. This affects both Zod validation schemas and potentially Drizzle ORM schema definitions.

**Affected Code:**
- Zod schemas with `.default()` (e.g., `z.string().default("value")`)
- Drizzle ORM table schemas with `.default()` on columns
- Any schema using `.default()` in edge runtime context

**Solution:**
```typescript
// ❌ WRONG - Causes edge runtime errors
const Schema = z.object({
  page: z.coerce.number().default(1),
  status: z.enum(['active', 'inactive']).default('active'),
});

// ✅ CORRECT - Use .optional() and handle defaults in code
const Schema = z.object({
  page: z.coerce.number().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// Then in your handler:
const { page = 1, status = 'active' } = parsed.data;
```

**Files Fixed:**
- `lib/validation.ts` - PaginationSchema
- `app/api/admin/scopes/route.ts` - CreateScopeSchema
- `lib/db/schema.ts` - scopes table definition

**Prevention:**
- Never use `.default()` in Zod schemas for edge runtime
- Always use `.optional()` and handle defaults in application code
- Test all new schemas in edge runtime before deploying

---

### 2. `export const runtime = 'edge'` Declaration Issues

**Issue:** API routes with explicit `export const runtime = 'edge'` declaration were failing with various errors.

**Root Cause:** In Cloudflare Workers deployment via OpenNext, API routes are already edge by default. Explicitly declaring the runtime can cause conflicts or unexpected behavior.

**Affected Code:**
- New API route files with `export const runtime = 'edge'`
- Specifically affected `/api/admin/users` and `/api/admin/scopes`

**Solution:**
```typescript
// ❌ WRONG - Causes issues in Cloudflare Workers
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  // ...
}

// ✅ CORRECT - Omit runtime declaration
export async function GET(request: NextRequest) {
  // ...
}
```

**Prevention:**
- Do NOT add `export const runtime = 'edge'` to API routes
- Cloudflare Workers are edge by default
- Only use runtime declarations when absolutely necessary and tested

---

### 3. Middleware Blocking API Routes

**Issue:** Middleware was intercepting `/api/admin/*` routes and redirecting before API handlers could run their own authentication.

**Root Cause:** Route matcher included API routes (`'/api/admin(.*)'`) in middleware checks, causing premature redirects.

**Affected Code:**
```typescript
// ❌ WRONG - Blocks API routes
const isAdminRoute = createRouteMatcher(['/admin(.*)', '/api/admin(.*)']);

if (isAdminRoute(request)) {
  // This runs for both pages AND API routes
  const role = await getUserRole();
  if (role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url));
  }
}
```

**Solution:**
```typescript
// ✅ CORRECT - Exclude API routes from middleware checks
const isAdminPageRoute = createRouteMatcher(['/admin(.*)']);
const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

if (isAdminPageRoute(request) && !isApiRoute) {
  // Only check page routes, not API routes
  const role = await getUserRole();
  if (role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', request.url));
  }
}
```

**Prevention:**
- Keep middleware route checks separate for pages vs API routes
- API routes should handle their own authentication via `requireRole()`
- Always exclude `/api/*` from middleware role checks

---

## ⚠️ Common Pitfalls

### Route Restructuring

**Issue:** When renaming routes (e.g., `/admin` → `/triage`), internal links break.

**Affected Areas:**
- Navigation components
- Report listing links
- Discord webhook URLs
- Breadcrumb navigation

**Prevention Checklist:**
- [ ] Update all navigation links in `SiteHeader.tsx`
- [ ] Update internal page links (breadcrumbs, back buttons)
- [ ] Update API response URLs (Discord webhooks, etc.)
- [ ] Search codebase for old route references: `grep -r "/old-route"`
- [ ] Test all navigation flows after route changes

---

### Database Schema Changes

**Issue:** Adding new tables requires multiple steps that can be missed.

**Required Steps:**
1. Add table definition to `lib/db/schema.ts`
2. Export table and types
3. Create SQL migration in `migrations/` folder
4. Run migration locally: `npx wrangler d1 execute vanguard-security --file=migrations/XXX.sql`
5. Run migration on production: `npx wrangler d1 execute vanguard-security --remote --file=migrations/XXX.sql`
6. Verify migration succeeded before deploying code

**Prevention:**
- Follow database migration workflow strictly
- Never deploy code that depends on new tables before running migrations
- Always test migrations locally first

---

## 🔧 Development Best Practices

### For Cloudflare Workers + Next.js

1. **Avoid `.default()` in Zod schemas** - Use `.optional()` and handle defaults in code
2. **Don't declare `runtime = 'edge'`** - It's already edge by default
3. **Let API routes handle their own auth** - Don't block them in middleware
4. **Test edge runtime compatibility** - Not all Node.js features work in edge
5. **Use `npm run dev:cf`** for local development - Simulates Cloudflare environment

### For API Endpoints

1. **Always use `requireRole()`** for authentication
2. **Return proper error responses** - Use `NextResponse.json()`
3. **Handle `Response` errors separately** - `if (err instanceof Response) return err;`
4. **Add detailed error logging** - Helps debug production issues
5. **Validate input with Zod** - Use `.safeParse()` for safety

### For Database Operations

1. **Use async/await** - All Drizzle operations are async
2. **Handle null/undefined** - Use `?.` and `??` operators
3. **Use transactions for multi-step operations** - Ensures data consistency
4. **Always run migrations before deploying** - Code depends on schema
5. **Test queries locally** - Use `npm run dev:cf` with local D1

---

## 📋 Testing Checklist for New Features

Before deploying new admin features:

- [ ] Test locally with `npm run dev:cf`
- [ ] Verify no `.default()` in Zod schemas
- [ ] Verify no `export const runtime = 'edge'` in API routes
- [ ] Test authentication and authorization
- [ ] Test error handling (invalid input, missing data, etc.)
- [ ] Run database migrations (local and production)
- [ ] Test in production after deployment
- [ ] Check Cloudflare Worker logs for errors
- [ ] Verify all navigation links work
- [ ] Test on mobile and desktop

---

## 🐛 Debugging Tips

### When API Routes Return 500 Errors

1. **Check Cloudflare Worker logs:**
   ```bash
   npx wrangler tail vanguard-vdp --format pretty
   ```

2. **Look for common errors:**
   - `Cannot read properties of undefined (reading 'default')` → Remove `.default()`
   - `TypeError: X is not a function` → Check edge runtime compatibility
   - `Binding not found` → Check D1 database binding

3. **Add detailed logging:**
   ```typescript
   console.error('[Endpoint] Error:', err);
   console.error('[Endpoint] Stack:', err instanceof Error ? err.stack : 'No stack');
   ```

### When Middleware Blocks Requests

1. **Check if route is matched correctly:**
   ```typescript
   console.log('Route:', request.nextUrl.pathname);
   console.log('Is API route:', request.nextUrl.pathname.startsWith('/api/'));
   ```

2. **Verify role extraction:**
   ```typescript
   console.log('User role:', role);
   console.log('Required role:', 'ADMIN');
   ```

---

## 📚 Related Documentation

- [Cloudflare Workers Edge Runtime](https://developers.cloudflare.com/workers/runtime-apis/)
- [Next.js Edge Runtime](https://nextjs.org/docs/app/building-your-application/rendering/edge-and-nodejs-runtimes)
- [Zod Documentation](https://zod.dev/)
- [Drizzle ORM with D1](https://orm.drizzle.team/docs/get-started-sqlite#cloudflare-d1)

---

**Last Updated:** May 15, 2026  
**Maintainer:** Platform Team
