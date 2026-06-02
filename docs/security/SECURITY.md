# Security Documentation

**Project:** Vanguard VDP
**Last Updated:** May 2026

This document combines the security audit findings and the Cloudflare hardening checklist.

---

## Part 1 — Security Audit

**Version:** v0.6.0-dev | **Audit Date:** May 18, 2026 | **Overall Risk:** 🟢 LOW

### Summary

All five critical security checks passed. The platform is production-ready from a security perspective.

| Check | Severity | Status |
|-------|----------|--------|
| Secrets Exposure | 10/10 | ✅ PASSED |
| Gitignore Coverage | 8/10 | ✅ PASSED |
| Custom Authentication | 9/10 | ✅ PASSED |
| SQL Injection / Unsanitized Input | 10/10 | ✅ PASSED |
| CORS Misconfiguration | 8/10 | ✅ PASSED |

### Key Findings

**Secrets Exposure — SECURE**
- No secrets found in source code or git history
- `.env` / `.env.local` / build artifacts properly gitignored
- All secrets managed via Cloudflare Workers Secrets:
  - `ENCRYPTION_KEY` — AES-GCM-256 key (64 hex chars)
  - `CLERK_SECRET_KEY` — Clerk auth secret
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk publishable key
  - `DISCORD_WEBHOOK_URL` — Optional, new report notifications

**Authentication — SECURE**
- Clerk v7 (`@clerk/nextjs: ^7.3.2`) — industry-standard provider
- No MD5/SHA1 hashing, no custom JWT signing, no localStorage token storage
- Roles stored in Clerk `publicMetadata` (server-side only)
- Route protection via `middleware.ts`, API-level checks via `requireRole()`

**SQL Injection — SECURE**
- All queries via Drizzle ORM (type-safe, parameterized)
- Input validated with Zod v4 on all API endpoints
- No `eval()`, no `dangerouslySetInnerHTML`, no raw string interpolation

**CORS — SECURE**
- Single-origin application — API and frontend served from same domain
- No wildcard CORS headers, no `cors()` middleware with unsafe defaults

### Security Practices

- **Encryption:** AES-GCM-256 for report body, email, and researcher drafts. Fresh 96-bit IV per encryption.
- **IP Privacy:** SHA-256 hashed before storage — never stored in plaintext
- **Audit Logging:** All triage actions, submissions, and status changes logged
- **OWASP Top 10:** All 10 categories addressed (see whitepaper for detail)

### Optional Enhancements

1. **Pre-commit hooks** — `husky` + `npm run lint` to prevent accidental secret commits
2. **Secret scanning in CI** — TruffleHog GitHub Action on push/PR
3. **Dependency scanning** — `npm audit --audit-level=moderate` in CI

---

## Part 2 — Cloudflare Security Checklist

**Platform:** Cloudflare Workers | **Last Updated:** May 18, 2026

### Priority Key
- 🔴 Critical — must be done before public release
- 🟡 Important — recommended for beta
- 🟢 Optional — nice-to-have for production

---

### 1. SSL/TLS 🔴

1. **Cloudflare Dashboard → SSL/TLS** → Set encryption mode to `Full (strict)`
2. Enable **Always Use HTTPS**
3. Set **Minimum TLS Version** to `TLS 1.2`
4. **SSL/TLS → Edge Certificates** → Enable HSTS (max-age: 15768000, includeSubDomains)

Verify:
```bash
curl -I https://vanguard.laet4x.com | grep -i "strict-transport-security"
```

---

### 2. WAF / Firewall Rules 🟡

**Block malicious traffic:** `(cf.threat_score gt 14)` → Block

**Protect admin routes:**
```
(http.request.uri.path matches "^/admin.*" and cf.threat_score gt 5) → Managed Challenge
```

**Block common attack patterns:**
```
(http.request.uri.path contains "../" or
 http.request.uri.path contains "wp-admin" or
 http.request.uri.path contains ".env") → Block
```

**Block bad user agents:**
```
(http.user_agent contains "sqlmap" or http.user_agent contains "nikto") → Block
```

---

### 3. Rate Limiting 🔴

**Report submission** (`POST /api/reports`):
- Period: 10s, Requests: 1, Action: Block (429)

**General API** (`/api/*`):
- Period: 60s, Requests: 30, Action: Block (429)

**Auth pages** (`/sign-in`, `/sign-up`):
- Period: 300s, Requests: 10, Action: Managed Challenge

> Application-level rate limiting (`lib/middleware/rate-limit.ts`) is also in place (3 submissions/minute per IP).

---

### 4. DDoS Protection 🟡

- **Security → DDoS** → Verify HTTP DDoS Attack Protection is enabled (sensitivity: Medium)
- Configure high sensitivity overrides for `/api/reports` and `/admin/*`
- Set up **Notifications → HTTP DDoS Attack Detected** alert

---

### 5. Bot Management 🟢

- **Security → Bots** → Enable **Bot Fight Mode** (free)
- Paid ($20/month): Super Bot Fight Mode adds ML detection + JS fingerprinting

---

### 6. Security Headers 🔴

Add via **Rules → Transform Rules → Modify Response Header**:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
X-XSS-Protection: 1; mode=block
```

Or via `middleware.ts` for more control (see `docs/RATE_LIMITING.md` for full CSP example).

---

### 7. Workers Security 🔴

```bash
# Verify all secrets are set
npx wrangler secret list
# Expected: CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, ENCRYPTION_KEY

# Create a manual D1 backup
npx wrangler d1 backup create vanguard-security

# Stream live logs
npx wrangler tail vanguard-vdp --format pretty
```

---

### 8. DNS Security 🟢

- **DNS → Settings** → Enable DNSSEC, add DS records to registrar
- Add CAA record: `issue "letsencrypt.org"`

---

### Quick Checklist — Before Public Beta

- [ ] SSL/TLS Full (strict) + HSTS enabled
- [ ] Rate limiting on `/api/reports`
- [ ] Security headers configured
- [ ] Bot Fight Mode enabled
- [ ] DDoS protection verified
- [ ] Monitoring alerts configured (`Security Events`, `Rate Limit Exceeded`, `SSL Expiry`)
- [ ] Worker secrets verified (`wrangler secret list`)
- [ ] D1 automatic backups enabled

### Before Production

- [ ] Upgrade to Workers Paid ($5/month) for Rate Limiting API
- [ ] Enable Super Bot Fight Mode
- [ ] Enable DNSSEC + CAA records
- [ ] Review all firewall rules
- [ ] Set up log retention (Logpush or Logpull)

---

### Incident Response

If under attack:

1. **Security → Settings** → Enable **Under Attack Mode**
2. **Security → Events** → Identify attack patterns → create blocking rules
3. **Security → Settings** → Set Security Level to High
4. Contact Cloudflare Support if attack persists

---

### Cost Reference

| Plan | Cost | Key Features |
|------|------|-------------|
| Free | $0 | SSL, basic DDoS, Bot Fight Mode, 5 WAF rules |
| Workers Paid | $5/mo | Rate Limiting API, 10M req/mo, advanced analytics |
| Pro | $20/mo | Super Bot Fight Mode, 20 WAF rules, advanced DDoS |
