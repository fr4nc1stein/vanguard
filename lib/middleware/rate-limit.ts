/**
 * Rate Limiting Middleware
 * 
 * Provides in-memory rate limiting for Cloudflare Workers.
 * Uses a sliding window algorithm for accurate rate limiting.
 * 
 * For production with multiple workers, use Cloudflare KV:
 * https://developers.cloudflare.com/workers/runtime-apis/kv/
 * 
 * Usage:
 *   import { rateLimit } from '@/lib/middleware/rate-limit';
 *   const { success, remaining, reset } = await rateLimit({
 *     key: request.headers.get('cf-connecting-ip') || 'anonymous',
 *     limit: 10,
 *     window: 60, // 60 seconds
 *   });
 *   if (!success) {
 *     return new Response('Rate limit exceeded', { status: 429 });
 *   }
 */

export interface RateLimitOptions {
  /** Unique identifier for the requester (IP, user ID, etc.) */
  key: string;
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  window: number;
  /** Prefix for KV storage keys (if using KV) */
  prefix?: string;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Unix timestamp when the window resets */
  reset: number;
  /** Total limit for this window */
  limit: number;
}

// In-memory store for single-worker deployments
// For multi-worker, replace with Cloudflare KV
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Cleans up expired entries from the in-memory store
 * Should be called periodically to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime <= now) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Rate limiting using sliding window counter algorithm
 * 
 * @param options - Rate limit configuration
 * @returns Rate limit result with success status and metadata
 */
export async function rateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, window } = options;
  const now = Date.now();
  const windowMs = window * 1000;
  const windowStart = now - windowMs;
  const reset = now + windowMs;

  // Get or create entry for this key
  let entry = rateLimitStore.get(key);

  // Clean up if window has reset
  if (!entry || entry.resetTime <= now) {
    entry = { count: 0, resetTime: reset };
  }

  // Increment counter
  entry.count++;
  entry.resetTime = reset;
  rateLimitStore.set(key, entry);

  // Calculate remaining
  const remaining = Math.max(0, limit - entry.count);
  const success = entry.count <= limit;

  return {
    success,
    remaining,
    reset,
    limit,
  };
}

/**
 * Creates rate limit headers for responses
 */
export function createRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', String(result.limit));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(Math.floor(result.reset / 1000)));
  return headers;
}

/**
 * Creates a 429 Too Many Requests response
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const headers = createRateLimitHeaders(result);
  headers.set('Content-Type', 'application/json');
  
  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers,
    }
  );
}

/**
 * Pre-configured rate limiters for common use cases
 */

// 100 requests per minute - standard API endpoints
export const standardRateLimit = (key: string) =>
  rateLimit({ key, limit: 100, window: 60 });

// 10 requests per minute - sensitive operations
export const sensitiveRateLimit = (key: string) =>
  rateLimit({ key, limit: 10, window: 60 });

// 5 requests per minute - authentication endpoints
export const authRateLimit = (key: string) =>
  rateLimit({ key, limit: 5, window: 60 });

// 3 requests per minute - report submission
export const reportSubmissionRateLimit = (key: string) =>
  rateLimit({ key, limit: 3, window: 60 });

// 1 request per second - high-frequency operations
export const burstRateLimit = (key: string) =>
  rateLimit({ key, limit: 1, window: 1 });

/**
 * Gets client IP from Cloudflare/standard headers
 */
export function getClientIP(request: Request): string {
  // Cloudflare-specific headers
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;

  // Standard headers (may be spoofed, use with caution)
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) return xRealIp;

  // Fallback
  return 'anonymous';
}
