/**
 * Rate Limiting Middleware
 * 
 * Export all middleware utilities
 */

// Re-export from rate-limit
export {
  rateLimit,
  createRateLimitHeaders,
  createRateLimitResponse,
  getClientIP,
  standardRateLimit,
  sensitiveRateLimit,
  authRateLimit,
  reportSubmissionRateLimit,
  burstRateLimit,
} from './rate-limit';

// Re-export types from rate-limit
export type { RateLimitOptions, RateLimitResult } from './rate-limit';

// Re-export from with-rate-limit
export {
  withRateLimit,
  userKeyGenerator,
  withStandardRateLimit,
  withSensitiveRateLimit,
  withAuthRateLimit,
  withReportRateLimit,
} from './with-rate-limit';

// Re-export types from with-rate-limit
export type { WithRateLimitOptions } from './with-rate-limit';
