# Cloudflare Security Checklist

**Project:** Vanguard VDP  
**Platform:** Cloudflare Workers + Pages  
**Last Updated:** May 18, 2026  
**Status:** Pre-Production Security Hardening

---

## Overview

This checklist covers all Cloudflare security features and configurations to harden your Vanguard VDP deployment before public beta/alpha release.

**Priority Levels:**
- 🔴 **Critical** - Must implement before public release
- 🟡 **Important** - Recommended for beta testing
- 🟢 **Optional** - Nice-to-have for production

---

## 1. SSL/TLS Configuration 🔴 CRITICAL

### Current Status
- [ ] Verify SSL certificate is active
- [ ] Check SSL/TLS encryption mode
- [ ] Enable HTTP Strict Transport Security (HSTS)
- [ ] Configure minimum TLS version

### Implementation

**Step 1: Verify SSL Certificate**
```bash
# Check SSL status
curl -I https://vanguard.laet4x.com | grep -i "strict-transport"
```

**Step 2: Configure SSL/TLS Settings**

1. Go to **Cloudflare Dashboard** → **SSL/TLS**
2. Set **Encryption mode:** `Full (strict)` ✅
3. Enable **Always Use HTTPS** ✅
4. Set **Minimum TLS Version:** `TLS 1.2` or higher ✅

**Step 3: Enable HSTS**

1. Go to **SSL/TLS** → **Edge Certificates**
2. Enable **HTTP Strict Transport Security (HSTS)**
   - **Max Age:** 6 months (15768000 seconds)
   - **Include subdomains:** Yes
   - **Preload:** Yes (optional, for production)

**Verification:**
```bash
curl -I https://vanguard.laet4x.com | grep -i "strict-transport-security"
# Should return: strict-transport-security: max-age=15768000; includeSubDomains
```

---

## 2. Firewall Rules 🟡 IMPORTANT

### Current Status
- [ ] Block malicious traffic
- [ ] Geo-blocking (if needed)
- [ ] Bot protection
- [ ] Challenge suspicious requests

### Implementation

**Rule 1: Block Known Malicious IPs**

1. Go to **Security** → **WAF** → **Custom rules**
2. Create rule: `block-malicious-traffic`
   - **Expression:** `(cf.threat_score gt 14)`
   - **Action:** Block
   - **Description:** Block requests with threat score > 14

**Rule 2: Protect Admin Routes**

```
Expression:
(http.request.uri.path matches "^/admin.*" and cf.threat_score gt 5)

Action: Challenge (Managed Challenge)
```

**Rule 3: Protect API Endpoints**

```
Expression:
(http.request.uri.path matches "^/api/.*" and 
 (cf.bot_management.score lt 30 or cf.threat_score gt 10))

Action: Challenge (Managed Challenge)
```

**Rule 4: Block Common Attack Patterns**

```
Expression:
(http.request.uri.path contains "../" or 
 http.request.uri.path contains "wp-admin" or
 http.request.uri.path contains ".env" or
 http.request.uri.path contains "phpMyAdmin")

Action: Block
```

---

## 3. Rate Limiting 🔴 CRITICAL

### Current Status
- [ ] Report submission rate limiting
- [ ] API endpoint rate limiting
- [ ] Login attempt rate limiting
- [ ] General traffic rate limiting

### Implementation

**Rule 1: Report Submission Protection**

1. Go to **Security** → **WAF** → **Rate limiting rules**
2. Create rule: `report-submission-limit`

**Option A: Strict (Recommended for Beta)**
```
Expression:
(http.request.uri.path eq "/api/reports" and http.request.method eq "POST")

Characteristics:
- Counting: ip.src
- Period: 10 seconds
- Requests: 1

Action: Block
Response code: 429
```
*Allows 1 report every 10 seconds (6 per minute, 360 per hour max)*

**Option B: Moderate**
```
Characteristics:
- Counting: ip.src
- Period: 10 seconds
- Requests: 2

Action: Block
Response code: 429
```
*Allows 2 reports every 10 seconds (12 per minute, 720 per hour max)*

**Option C: Lenient (Testing)**
```
Characteristics:
- Counting: ip.src
- Period: 10 seconds
- Requests: 5

Action: Block
Response code: 429
```
*Allows 5 reports every 10 seconds (30 per minute max)*

**Rule 2: General API Rate Limit**

```
Expression:
(http.request.uri.path matches "^/api/.*")

Characteristics:
- Counting: ip.src
- Period: 60 seconds
- Requests: 30

Action: Block
Response code: 429
```

**Rule 3: Authentication Rate Limit**

```
Expression:
(http.request.uri.path contains "/sign-in" or 
 http.request.uri.path contains "/sign-up")

Characteristics:
- Counting: ip.src
- Period: 300 seconds (5 minutes)
- Requests: 10

Action: Challenge (Managed Challenge)
```

**Verification:**
```bash
# Test rate limiting
for i in {1..6}; do 
  curl -X POST https://vanguard.laet4x.com/api/reports \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}' \
    -w "\nStatus: %{http_code}\n"
done
# 6th request should return 429
```

---

## 4. DDoS Protection 🟡 IMPORTANT

### Current Status
- [ ] HTTP DDoS protection enabled
- [ ] Layer 7 DDoS mitigation
- [ ] Advanced DDoS protection configured

### Implementation

**Step 1: Enable HTTP DDoS Protection**

1. Go to **Security** → **DDoS**
2. Verify **HTTP DDoS Attack Protection** is enabled ✅
3. Set sensitivity: `Medium` (default)

**Step 2: Configure Advanced Protection**

1. Enable **Advanced TCP Protection** (if available)
2. Enable **Advanced HTTP Protection**
3. Set **Override sensitivity** for critical paths:
   - `/api/reports` → High sensitivity
   - `/admin/*` → High sensitivity

**Step 3: Set Up Alerts**

1. Go to **Notifications**
2. Create alert: **DDoS Attack Detected**
   - Trigger: HTTP DDoS attack detected
   - Notification: Email + Webhook

---

## 5. Bot Management 🟢 OPTIONAL

### Current Status
- [ ] Bot Fight Mode enabled (free)
- [ ] Super Bot Fight Mode (paid)
- [ ] Bot Management for Enterprise

### Implementation

**Free Tier: Bot Fight Mode**

1. Go to **Security** → **Bots**
2. Enable **Bot Fight Mode** ✅
3. Configure:
   - **Definitely automated:** Block
   - **Likely automated:** Challenge

**Paid Tier: Super Bot Fight Mode** ($20/month)

Additional features:
- Machine learning bot detection
- JavaScript fingerprinting
- Anomaly detection
- Verified bot allowlist

**Verification:**
```bash
# Check bot detection
curl -A "BadBot/1.0" https://vanguard.laet4x.com
# Should be challenged or blocked
```

---

## 6. Page Rules & Caching 🟡 IMPORTANT

### Current Status
- [ ] Cache static assets
- [ ] Bypass cache for dynamic content
- [ ] Security headers configured

### Implementation

**Rule 1: Cache Static Assets**

1. Go to **Rules** → **Page Rules**
2. Create rule: `https://vanguard.laet4x.com/_next/static/*`
   - **Cache Level:** Cache Everything
   - **Edge Cache TTL:** 1 month
   - **Browser Cache TTL:** 1 month

**Rule 2: Bypass Cache for API**

```
URL: https://vanguard.laet4x.com/api/*
Settings:
- Cache Level: Bypass
- Security Level: High
```

**Rule 3: Security Headers**

```
URL: https://vanguard.laet4x.com/*
Settings:
- Security Level: Medium
- Browser Integrity Check: On
```

---

## 7. Security Headers 🔴 CRITICAL

### Current Status
- [ ] Content Security Policy (CSP)
- [ ] X-Frame-Options
- [ ] X-Content-Type-Options
- [ ] Referrer-Policy
- [ ] Permissions-Policy

### Implementation

**Option 1: Via Transform Rules (Recommended)**

1. Go to **Rules** → **Transform Rules** → **Modify Response Header**
2. Create rule: `security-headers`

**Headers to add:**

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
X-XSS-Protection: 1; mode=block
```

**Option 2: Via Worker (More Control)**

Add to `middleware.ts`:

```typescript
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.vanguard.laet4x.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://clerk.vanguard.laet4x.com https://api.clerk.com;"
  );
  
  return response;
}
```

**Verification:**
```bash
curl -I https://vanguard.laet4x.com | grep -E "X-Frame|X-Content|Referrer|Permissions"
```

---

## 8. Access Control 🟡 IMPORTANT

### Current Status
- [ ] IP Access Rules configured
- [ ] User Agent blocking
- [ ] Country blocking (if needed)

### Implementation

**Block Specific Countries (Optional)**

1. Go to **Security** → **WAF** → **Tools**
2. **IP Access Rules** → Add rule
   - **Value:** Country code (e.g., `CN`, `RU`)
   - **Action:** Block
   - **Note:** Only if you have specific geographic restrictions

**Block Bad User Agents**

Create WAF custom rule:

```
Expression:
(http.user_agent contains "sqlmap" or
 http.user_agent contains "nikto" or
 http.user_agent contains "nmap" or
 http.user_agent eq "")

Action: Block
```

**Allowlist Known IPs (Optional)**

For your own IP or trusted security researchers:

```
Expression:
(ip.src in {YOUR_IP_ADDRESS})

Action: Skip (All remaining rules)
```

---

## 9. DNS Security 🟢 OPTIONAL

### Current Status
- [ ] DNSSEC enabled
- [ ] CAA records configured
- [ ] DNS firewall (if needed)

### Implementation

**Enable DNSSEC**

1. Go to **DNS** → **Settings**
2. Enable **DNSSEC** ✅
3. Add DS records to your domain registrar

**Configure CAA Records**

1. Go to **DNS** → **Records**
2. Add CAA record:
   ```
   Type: CAA
   Name: @
   Tag: issue
   Value: letsencrypt.org
   ```

**Verification:**
```bash
dig +dnssec vanguard.laet4x.com
dig CAA vanguard.laet4x.com
```

---

## 10. Monitoring & Alerts 🔴 CRITICAL

### Current Status
- [ ] Security event notifications
- [ ] Rate limit alerts
- [ ] DDoS attack alerts
- [ ] SSL expiration alerts

### Implementation

**Step 1: Configure Notifications**

1. Go to **Notifications**
2. Add notification destinations:
   - Email: your-email@example.com
   - Webhook: Discord/Slack (optional)

**Step 2: Enable Security Alerts**

Enable these notifications:
- ✅ **HTTP DDoS Attack Detected**
- ✅ **Advanced Security Events**
- ✅ **SSL/TLS Certificate Expiration**
- ✅ **Zone-level Rate Limit Exceeded**
- ✅ **Firewall Events**

**Step 3: Set Up Log Retention**

1. Go to **Analytics** → **Logs**
2. Enable **Logpush** (paid feature) or use **Logpull**
3. Configure retention: 7-30 days

**Step 4: Monitor Worker Logs**

```bash
# Real-time logs
npx wrangler tail vanguard-vdp --format pretty

# Filter for errors
npx wrangler tail vanguard-vdp | grep -i "error\|429\|403"
```

---

## 11. Workers Security 🔴 CRITICAL

### Current Status
- [ ] Environment variables secured
- [ ] Secrets properly managed
- [ ] Worker bindings configured
- [ ] Observability enabled

### Implementation

**Step 1: Verify Secrets**

```bash
# List all secrets (doesn't show values)
npx wrangler secret list

# Ensure these are set:
# - CLERK_SECRET_KEY
# - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# - ENCRYPTION_KEY
```

**Step 2: Enable Observability**

Update `wrangler.toml`:

```toml
[observability]
enabled = true
head_sampling_rate = 1

[observability.logs]
enabled = true
persist = true
invocation_logs = true

[observability.traces]
enabled = true
persist = true
```

**Step 3: Configure D1 Backup**

```bash
# Create manual backup
npx wrangler d1 backup create vanguard-security

# Schedule automatic backups (via dashboard)
# Go to D1 → vanguard-security → Backups → Enable automatic backups
```

**Step 4: Review Worker Bindings**

Verify in `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "vanguard-security"
database_id = "YOUR-DATABASE-ID"
```

---

## 12. Audit & Compliance 🟡 IMPORTANT

### Current Status
- [ ] Security audit log enabled
- [ ] Compliance mode configured
- [ ] Data retention policies set
- [ ] GDPR compliance verified

### Implementation

**Step 1: Enable Audit Logs**

1. Go to **Account** → **Audit Log**
2. Enable **Audit Log** ✅
3. Set retention: 90 days minimum

**Step 2: Configure Data Localization (if needed)**

1. Go to **Network** → **Data Localization**
2. Set regional restrictions if required by compliance

**Step 3: Review Privacy Settings**

1. Verify IP anonymization (if required)
2. Check data retention policies
3. Ensure GDPR compliance features are enabled

**Step 4: Document Compliance**

Create `docs/COMPLIANCE.md`:
- Data processing locations
- Encryption standards
- Retention policies
- User rights (access, deletion, portability)

---

## Quick Start Checklist

### Before Beta Launch (Critical)

- [ ] SSL/TLS set to Full (strict)
- [ ] HSTS enabled
- [ ] Rate limiting on `/api/reports` (5/hour)
- [ ] Security headers configured
- [ ] Bot Fight Mode enabled
- [ ] DDoS protection verified
- [ ] Monitoring alerts configured
- [ ] Worker secrets verified
- [ ] D1 backups enabled

### Before Production (Important)

- [ ] Upgrade to Workers Paid plan ($5/month)
- [ ] Enable Super Bot Fight Mode
- [ ] Configure advanced rate limiting
- [ ] Set up log retention
- [ ] Enable DNSSEC
- [ ] Configure CAA records
- [ ] Review all firewall rules
- [ ] Test incident response

### Optional Enhancements

- [ ] Geo-blocking (if needed)
- [ ] IP allowlist for trusted IPs
- [ ] Advanced DDoS protection
- [ ] Custom error pages
- [ ] Load balancing (if scaling)

---

## Verification Commands

### SSL/TLS
```bash
curl -I https://vanguard.laet4x.com | grep -i "strict-transport"
openssl s_client -connect vanguard.laet4x.com:443 -tls1_2
```

### Security Headers
```bash
curl -I https://vanguard.laet4x.com | grep -E "X-Frame|X-Content|CSP|Referrer"
```

### Rate Limiting
```bash
for i in {1..10}; do curl -X POST https://vanguard.laet4x.com/api/reports; done
```

### Bot Protection
```bash
curl -A "BadBot/1.0" https://vanguard.laet4x.com
curl -A "Mozilla/5.0" https://vanguard.laet4x.com
```

### DNS Security
```bash
dig +dnssec vanguard.laet4x.com
dig CAA vanguard.laet4x.com
```

---

## Cost Summary

### Free Tier
- ✅ SSL/TLS
- ✅ Basic DDoS protection
- ✅ Bot Fight Mode
- ✅ 5 WAF custom rules
- ✅ 5 Page rules
- ✅ Basic analytics

### Workers Paid ($5/month)
- ✅ All free tier features
- ✅ Rate Limiting API
- ✅ 10M requests/month
- ✅ Advanced analytics
- ✅ Longer log retention

### Pro Plan ($20/month)
- ✅ All Workers features
- ✅ Super Bot Fight Mode
- ✅ 20 WAF custom rules
- ✅ 20 Page rules
- ✅ Advanced DDoS protection
- ✅ Image optimization

---

## Incident Response

### If Under Attack

1. **Enable "I'm Under Attack" Mode**
   - Go to **Security** → **Settings**
   - Enable **Under Attack Mode**
   - All visitors will see a challenge page

2. **Review Firewall Events**
   - Go to **Security** → **Events**
   - Identify attack patterns
   - Create blocking rules

3. **Increase Security Level**
   - Go to **Security** → **Settings**
   - Set **Security Level:** High

4. **Contact Cloudflare Support**
   - If attack persists
   - Enterprise customers: 24/7 support

---

## Next Steps

1. **Immediate:** Complete "Before Beta Launch" checklist
2. **Week 1:** Monitor security events and adjust rules
3. **Week 2:** Review analytics and fine-tune rate limits
4. **Before Production:** Complete "Before Production" checklist
5. **Ongoing:** Monthly security review and updates

---

## References

- [Cloudflare Security Center](https://developers.cloudflare.com/security-center/)
- [WAF Custom Rules](https://developers.cloudflare.com/waf/custom-rules/)
- [Rate Limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- [DDoS Protection](https://developers.cloudflare.com/ddos-protection/)
- [Workers Security](https://developers.cloudflare.com/workers/platform/security/)

---

**Last Updated:** May 18, 2026  
**Next Review:** Before public beta launch
