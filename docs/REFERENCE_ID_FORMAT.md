# Reference ID Format

## Current Format (v2.0)

**Pattern:** `VVDP-[S]-YYYY-XXXXXXXX`

Where:
- `VVDP` = Vanguard Vulnerability Disclosure Program
- `[S]` = Severity code (single character)
- `YYYY` = Year of submission
- `XXXXXXXX` = 8-character cryptographically secure random hex

## Severity Codes

| Code | Severity | Example |
|------|----------|---------|
| `C` | Critical | `VVDP-C-2026-A3F2B891` |
| `H` | High | `VVDP-H-2026-7D4E2C10` |
| `M` | Medium | `VVDP-M-2026-9B1A5F33` |
| `L` | Low | `VVDP-L-2026-4C8D7E22` |
| `I` | Info | `VVDP-I-2026-6F2A9D44` |

## Design Rationale

### Why Include Severity?
1. **Instant Triage Priority** - Triagers can immediately identify critical reports
2. **Easy Filtering** - Filter by pattern: `VVDP-C-*` for all critical reports
3. **Professional Appearance** - Clear, structured format
4. **Metrics Friendly** - Easy to count reports by severity

### Why Immutable Severity?
The severity in the reference ID is set at **submission time** and **never changes**. This ensures:
- Reference IDs remain stable across the report lifecycle
- No confusion when severity is adjusted during triage
- Audit trail maintains original researcher assessment

**Note:** The database stores both:
- `initial_severity` (embedded in ref ID, immutable)
- `severity` (current severity, can be adjusted by triagers)

### Security Considerations
- **8-character random hex** = ~4.3 billion possibilities per year per severity
- **Cryptographically secure** using `crypto.randomUUID()`
- **Non-enumerable** - Cannot predict valid IDs
- **Collision resistant** - Retry logic handles rare duplicates

## Migration from v1.0

**Old Format:** `BGP-YYYY-NNNN` (4-digit sequential)

**Migration Notes:**
- Old reference IDs remain valid and searchable
- New submissions use VVDP format starting from implementation date
- No data migration required - both formats coexist

## Examples in Context

### Discord Notification
```
🔴 New Critical Report [VVDP-C-2026-A3F2B891]
Reference: VVDP-C-2026-A3F2B891
Severity: Critical
Target: vanguard.laet4x.com
```

### Admin Panel
```
VVDP-C-2026-A3F2B891  |  SQL Injection in Login  |  Critical  |  New
VVDP-H-2026-7D4E2C10  |  XSS in Comments         |  High      |  Triaged
VVDP-M-2026-9B1A5F33  |  CSRF on Profile Update  |  Medium    |  Accepted
```

### Email to Researcher
```
Subject: Your Report VVDP-C-2026-A3F2B891 Has Been Accepted

Dear Security Researcher,

Thank you for your submission VVDP-C-2026-A3F2B891 regarding SQL Injection 
in the login endpoint. Our team has validated the issue and marked it as 
accepted.
```

## Implementation

See `app/api/reports/route.ts`:

```typescript
function generateRefId(severity: string): string {
  const year = new Date().getFullYear();
  const random = crypto.randomUUID().slice(0, 8).toUpperCase();
  const severityCode = severity.charAt(0).toUpperCase();
  return `VVDP-${severityCode}-${year}-${random}`;
}
```

## Validation Pattern

Regex for validating reference IDs:

```regex
^VVDP-[CHML I]-\d{4}-[A-F0-9]{8}$
```

JavaScript validation:
```javascript
const isValidRefId = (refId) => /^VVDP-[CHMLI]-\d{4}-[A-F0-9]{8}$/.test(refId);
```
