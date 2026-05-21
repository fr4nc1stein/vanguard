# Rate Limiting Configuration

This document describes how to implement rate limiting for Vanguard VDP using Cloudflare WAF and application-level middleware.

## Overview

Rate limiting is critical for:
- Preventing brute force attacks
- Protecting against DoS attacks
- Ensuring fair usage of resources
- Reducing server load

## Implementation Layers

### 1. Application-Level Rate Limiting (In-Place)

The application-level rate limiter is implemented in `lib/middleware/rate-limit.ts`.

**Current Limits:**
| Endpoint Type | Requests | Window | Use Case |
|---------------|----------|--------|----------|
| Report Submission | 3 | 60s | Prevent spam submissions |
| Authentication | 5 | 60s | Login/brute force protection |
| Sensitive Operations | 10 | 60s | Admin actions |
| Standard API | 100 | 60s | General API usage |

**Usage:**

```typescript
import { withRateLimit } from '@/lib/middleware/with-rate-limit';

// Example: Rate-limited report submission
export const POST = withRateLimit(
  async (request) => {
    // Your handler here
    return Response.json({ success: true });
  },
  { limit: 3, window: 60 }  // 3 requests per minute
);

// Or use pre-configured limiters
import { withReportRateLimit } from '@/lib/middleware/with-rate-limit';

export const POST = withReportRateLimit(async (request) => {
  // Handler
  return Response.json({ success: true });
});
```

### 2. Cloudflare WAF Rate Limiting

Cloudflare WAF provides an additional layer of protection at the edge.

#### Setup via Cloudflare Dashboard

1. **Navigate to:** Security > WAF > Rate limiting rules

2. **Create a new rule for report submission:**

```
Rule Name: Report Submission Rate Limit
Visitor rate: 
  - 10 requests per 1 minute per IP
Matching behavior:
  - When incoming requests match:
    - Field: URL Pattern
    - Operator: contains
    - Value: /api/reports
Action: Block
```

3. **Create a rule for authentication:**

```
Rule Name: Login Rate Limit
Visitor rate:
  - 5 requests per 1 minute per IP
Matching behavior:
  - When incoming requests match:
    - Field: URL Pattern
    - Operator: contains
    - Value: /sign-in or /sign-up
Action: Block
```

4. **Create a general API rule:**

```
Rule Name: API General Rate Limit
Visitor rate:
  - 100 requests per 1 minute per IP
Matching behavior:
  - When incoming requests match:
    - Field: URL Pattern
    - Operator: starts with
    - Value: /api/
Action: Challenge (or Block for severe abuse)
```

#### Setup via API

```bash
# Create rate limit rule via Cloudflare API
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/firewall/rules" \
  -H "Authorization: Bearer {API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "rules": [
      {
        "description": "Report submission rate limit",
        "action": "block",
        "priority": 1,
        "match": {
          "url_pattern": "vanguard.laet4x.com/api/reports*",
          "limit": 10,
          "limit_period": 60,
          "limit_response": {
            "status_code": 429,
            "content_type": "application/json",
            "body": "{\"error\": \"Rate limit exceeded\"}"
          }
        }
      }
    ]
  }'
```

### 3. Cloudflare Super Bot Fight Mode

Enable Bot Fight Mode for additional protection:

1. Navigate to: Security > Bots
2. Enable "Bot Fight Mode" (free tier)
3. For Enterprise: Enable "Super Bot Fight Mode"

### 4. IP Access Rules

Block known malicious IPs:

1. Navigate to: Security > Overview > Tools
2. Use "IP Access Rules" to block specific IPs or ranges

## Response Headers

When rate limiting is active, the following headers are added to responses:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum requests allowed in the window |
| `X-RateLimit-Remaining` | Remaining requests in the current window |
| `X-RateLimit-Reset` | Unix timestamp when the window resets |

## Rate Limit Exceeded Response

When a client exceeds the rate limit, they receive:

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 45
}
```

HTTP Status: `429 Too Many Requests`

## Best Practices

1. **Use tiered rate limits** - Different limits for different operations
2. **Return informative headers** - Help clients implement backoff
3. **Use challenge pages** - For bot detection, use CAPTCHAs instead of hard blocks
4. **Monitor and adjust** - Review rate limit data in Cloudflare Analytics
5. **Allow some headroom** - Set limits slightly higher than expected legitimate usage
6. **Consider user tiers** - Authenticated users may need higher limits than anonymous

## Monitoring

View rate limiting metrics in Cloudflare:

1. **Security Overview:** Shows blocked requests
2. **Analytics:** Traffic patterns and rate limit triggers
3. **Logs:** Detailed firewall event logs (Logpush recommended)

## Troubleshooting

### Rate limiting too aggressive
- Check Cloudflare Analytics for false positives
- Review User Agent strings of blocked requests
- Adjust limits to accommodate legitimate bulk operations

### Rate limiting not working
- Verify Cloudflare WAF rules are enabled
- Check rule priority (lower number = higher priority)
- Ensure rules are not paused

### Application-level rate limiting not working
- Verify the middleware is imported correctly
- Check that `getClientIP()` is returning correct IPs
- Ensure rate limit store is not being cleared

## Future Enhancements

1. **Cloudflare KV-based rate limiting** for distributed workers
2. **Per-user rate limits** based on Clerk authentication
3. **Adaptive rate limiting** based on request patterns
4. **Redis integration** for enterprise deployments
