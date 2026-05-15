/**
 * Next.js Instrumentation Hook
 *
 * Runs once on server startup BEFORE any routes are served.
 * Used to initialise Cloudflare platform bindings (D1, etc.) for local `next dev`.
 *
 * In production (Cloudflare Pages), getRequestContext() resolves bindings from
 * the Workers runtime directly — this file does nothing in production.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
/**
 * Next.js Instrumentation Hook
 *
 * In production (Cloudflare Pages), getCloudflareContext() resolves bindings
 * from the Workers runtime directly.
 *
 * For local dev with D1: run `npm run dev:cf` (wrangler pages dev).
 * `npm run dev` (plain next dev) won't have D1 bindings.
 */
export async function register() {
  // No-op: CF bindings are available automatically in production Workers runtime.
  // For local D1 access, use: npm run dev:cf
}
