/**
 * Rate Limiting Middleware Wrapper
 * 
 * Provides easy integration with Next.js API routes.
 * 
 * Usage in API routes:
 * 
 * ```typescript
 * import { withRateLimit } from '@/lib/middleware/with-rate-limit';
 * 
 * export const POST = withRateLimit(
 *   async (request) => {
 *     // Your handler
 *     return Response.json({ success: true });
 *   },
 *   { limit: 3, window: 60 } // 3 requests per minute
 * );
 * ```
 */

import { 
  rateLimit, 
  getClientIP, 
  createRateLimitHeaders, 
  createRateLimitResponse,
  type RateLimitResult 
} from './rate-limit';

interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Window size in seconds */
  window: number;
}

type NextHandler = (request: Request) => Promise<Response>;

export interface WithRateLimitOptions extends RateLimitConfig {
  /** Custom key generator function */
  keyGenerator?: (request: Request) => string;
}

/**
 * Wraps an API handler with rate limiting
 */
export function withRateLimit(
  handler: NextHandler,
  config: RateLimitConfig,
  options?: WithRateLimitOptions
) {
  return async (request: Request): Promise<Response> => {
    const key = options?.keyGenerator
      ? options.keyGenerator(request)
      : getClientIP(request);

    const result: RateLimitResult = await rateLimit({
      key,
      limit: config.limit,
      window: config.window,
    });

    // If rate limited, return 429 response
    if (!result.success) {
      return createRateLimitResponse(result);
    }

    // Execute the handler
    const response = await handler(request);

    // Add rate limit headers to successful responses
    const headers = createRateLimitHeaders(result);
    response.headers.forEach((value, key) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * Creates a key generator based on user authentication
 */
export function userKeyGenerator(request: Request): string {
  // Try to get user ID from Clerk auth header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // You could decode the JWT here to get user ID
    // For now, use the full header as the key
    return `user:${authHeader}`;
  }

  // Fall back to IP-based limiting
  return `ip:${getClientIP(request)}`;
}

/**
 * Pre-configured rate-limited route handlers
 */

// Standard API route - 100 requests/minute
export function withStandardRateLimit(handler: NextHandler) {
  return withRateLimit(handler, { limit: 100, window: 60 });
}

// Sensitive operations - 10 requests/minute
export function withSensitiveRateLimit(handler: NextHandler) {
  return withRateLimit(handler, { limit: 10, window: 60 });
}

// Auth endpoints - 5 requests/minute
export function withAuthRateLimit(handler: NextHandler) {
  return withRateLimit(handler, { limit: 5, window: 60 });
}

// Report submission - 3 requests/minute
export function withReportRateLimit(handler: NextHandler) {
  return withRateLimit(handler, { limit: 3, window: 60 });
}
