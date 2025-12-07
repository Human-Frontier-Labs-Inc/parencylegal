# Parency Legal Security Audit Report - Technical

**Date:** December 7, 2025
**Auditor:** Claude Security Analyzer
**Scope:** Full application security audit

---

## Executive Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 1 | Requires immediate action |
| HIGH | 3 | Requires action within 7 days |
| MEDIUM | 5 | Requires action within 30 days |
| LOW | 3 | Should be addressed |

**Overall Risk Score: 6.8/10 (MEDIUM-HIGH)**

---

## 1. Critical Findings

### 1.1 Exposed Test Credentials in `.env.example` (CRITICAL)

**File:** `.env.example`
**Risk Score:** 9.5/10
**CVSS:** N/A (Configuration Issue)

**Finding:** The `.env.example` file contains actual Clerk test API keys:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZGl2aW5lLWNhdHRsZS0xLmNsZXJrLmFjY291bnRzLmRldiQ
CLERK_SECRET_KEY=sk_test_G71M13xCRHtDgSDur70nmZNKk7oe9A4EgEnl6r2LrI
```

**Impact:** Attackers could use these keys to:
- Access your Clerk test environment
- Potentially pivot to production if keys are similar
- Enumerate user data in test environment

**Remediation:**
```bash
# 1. Immediately rotate these keys in Clerk dashboard
# 2. Update .env.example with placeholder values:
```

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Validation Test:**
```bash
# Pre-fix: Should find actual keys
grep -E "pk_test_[A-Za-z0-9]+" .env.example && echo "VULNERABLE"

# Post-fix: Should only find placeholders
grep -E "pk_test_\.\.\." .env.example && echo "FIXED"
```

---

## 2. High Severity Findings

### 2.1 PDF.js Arbitrary JavaScript Execution (CVE-2024-4367)

**Package:** `pdfjs-dist@3.11.174`
**Risk Score:** 8.8/10
**CVSS:** 8.8 (HIGH)

**Finding:** The installed version of PDF.js is vulnerable to arbitrary JavaScript execution when opening malicious PDF files.

**Impact:**
- Arbitrary code execution in user browser context
- XSS attacks via malicious PDFs
- Data exfiltration from authenticated sessions
- Particularly dangerous for a legal document platform

**Remediation:**
```bash
# Update to patched version
npm install pdfjs-dist@4.2.67

# If breaking changes, set workaround:
# In PDF viewer config, set: isEvalSupported: false
```

**Validation Test:**
```javascript
// Pre-fix test
const pdfjs = require('pdfjs-dist/package.json');
console.assert(pdfjs.version < '4.2.67', 'Vulnerable version detected');

// Post-fix test
console.assert(pdfjs.version >= '4.2.67', 'Patched version confirmed');
```

---

### 2.2 JWS HMAC Signature Bypass (HIGH)

**Package:** `jws@4.0.0` (transitive dependency)
**Risk Score:** 7.5/10
**CVSS:** 7.5 (HIGH)

**Finding:** The `jws` package improperly verifies HMAC signatures, allowing potential authentication bypass.

**Impact:**
- JWT token forgery
- Authentication bypass
- Privilege escalation

**Remediation:**
```bash
# Check which package depends on jws
npm ls jws

# Update the parent package or override
npm update <parent-package>
```

---

### 2.3 Missing Security Headers (HIGH)

**Risk Score:** 7.0/10

**Finding:** No security headers configured in `next.config.mjs`:

| Header | Status | Risk |
|--------|--------|------|
| Content-Security-Policy | Missing | XSS attacks |
| X-Frame-Options | Missing | Clickjacking |
| X-Content-Type-Options | Missing | MIME sniffing |
| Strict-Transport-Security | Missing | Downgrade attacks |
| Referrer-Policy | Missing | Information leakage |

**Remediation:**
```javascript
// next.config.mjs
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://*.clerk.com https://*.supabase.co https://api.openai.com https://api.stripe.com;"
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  },
  // ... existing config
};
```

---

## 3. Medium Severity Findings

### 3.1 esbuild Development Server Cross-Origin Vulnerability

**Package:** `esbuild@<=0.24.2` (via drizzle-kit)
**Risk Score:** 5.3/10
**CVSS:** 5.3 (MEDIUM)

**Finding:** esbuild development server allows any website to send requests and read responses.

**Impact:** Development environment only - data leakage during local development.

**Remediation:**
```bash
# Update drizzle-kit to get patched esbuild
npm install drizzle-kit@latest
```

---

### 3.2 PostCSS ReDoS Vulnerabilities (3 CVEs)

**Package:** `postcss@8`
**CVEs:** CVE-2021-23382, CVE-2021-23368, CVE-2023-44270
**Risk Score:** 5.3/10

**Finding:** Multiple regex denial-of-service vulnerabilities in PostCSS.

**Impact:**
- Build process DoS
- CI/CD pipeline disruption
- No runtime impact (build-time only)

**Remediation:**
```bash
npm install postcss@8.4.31
```

---

### 3.3 No Rate Limiting on API Endpoints (MEDIUM)

**Risk Score:** 6.0/10

**Finding:** No rate limiting detected on API routes.

**Affected Endpoints:**
- `/api/cases/*` - Case CRUD operations
- `/api/documents/*` - Document operations
- `/api/cases/[id]/chat` - AI chat (expensive operations)

**Impact:**
- API abuse
- Resource exhaustion
- Increased OpenAI API costs
- Potential DoS

**Remediation:**
```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
  analytics: true,
});

// Usage in API route:
export async function POST(req: Request) {
  const { userId } = auth();
  const { success, limit, reset, remaining } = await ratelimit.limit(userId);

  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 });
  }
  // ... rest of handler
}
```

---

### 3.4 TypeScript/ESLint Errors Ignored in Build (MEDIUM)

**File:** `next.config.mjs`
**Risk Score:** 5.0/10

**Finding:**
```javascript
typescript: {
  ignoreBuildErrors: true,
},
eslint: {
  ignoreDuringBuilds: true,
},
```

**Impact:**
- Type-related bugs may reach production
- Security-related lint rules bypassed
- Potential runtime errors

**Remediation:**
Enable strict checks before production:
```javascript
typescript: {
  ignoreBuildErrors: process.env.NODE_ENV !== 'production',
},
```

---

### 3.5 Multiple .env Files Found (MEDIUM)

**Risk Score:** 5.5/10

**Finding:** Multiple environment files detected:
- `.env.local` ✓ (gitignored)
- `.env.local.backup` ⚠ (should not exist)
- `.env.production.local` ✓ (gitignored)
- `.env.example` ⚠ (contains real keys)

**Remediation:**
```bash
# Remove backup file
rm .env.local.backup

# Ensure .gitignore covers all sensitive files
echo ".env*.backup" >> .gitignore
```

---

## 4. Low Severity Findings

### 4.1 dangerouslySetInnerHTML Usage

**File:** `components/ui/chart.tsx:81`
**Risk Score:** 3.0/10

**Finding:** Uses `dangerouslySetInnerHTML` for CSS injection.

**Assessment:** LOW RISK - The content is generated from a controlled theme configuration, not user input. The pattern is:
```javascript
dangerouslySetInnerHTML={{
  __html: Object.entries(THEMES).map(...)  // Static theme data
}}
```

**Recommendation:** Add comment documenting the safety of this usage.

---

### 4.2 Regex exec() Usage

**Files:** `lib/ai/chunking.ts`, `lib/ai/legal-drafting.ts`, `components/chat/case-chat.tsx`
**Risk Score:** 2.0/10

**Finding:** Using `regex.exec()` in loops.

**Assessment:** LOW RISK - Used for safe text parsing operations, not user-controlled patterns.

---

### 4.3 SQL Template Literals in Tests

**File:** `tests/db/rls-policies.test.ts`
**Risk Score:** 1.0/10

**Finding:** Raw SQL queries using template literals.

**Assessment:** ACCEPTABLE - Used only in test files with Drizzle ORM's `sql` tagged template which provides parameterization.

---

## 5. Positive Security Findings

### 5.1 Authentication
- ✅ Clerk authentication properly configured
- ✅ Protected routes use `clerkMiddleware`
- ✅ OAuth state validation for CSRF protection (Dropbox, OneDrive)

### 5.2 Database Security
- ✅ Using Drizzle ORM (parameterized queries)
- ✅ RLS policies tested
- ✅ Service role key properly separated

### 5.3 Environment Variables
- ✅ Zod validation for all env vars (`lib/env.ts`)
- ✅ Sensitive files in `.gitignore`
- ✅ No hardcoded secrets in source code

### 5.4 Webhook Security
- ✅ Stripe webhook signature validation
- ✅ Webhook routes excluded from auth middleware

---

## 6. Remediation Priority Matrix

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| P0 | Rotate Clerk keys in .env.example | 15 min | Critical |
| P1 | Update pdfjs-dist to 4.2.67 | 30 min | High |
| P2 | Add security headers | 1 hour | High |
| P3 | Implement rate limiting | 2 hours | Medium |
| P4 | Update postcss, esbuild deps | 30 min | Medium |
| P5 | Enable TypeScript checks | 2 hours | Medium |
| P6 | Clean up .env files | 15 min | Low |

---

## 7. Dependency Summary

| Total Dependencies | Vulnerabilities | Severity |
|-------------------|-----------------|----------|
| 93 direct | 6 | 2 High, 4 Moderate |
| 1,113 total | - | - |

---

## 8. Next Steps

1. **Immediate (Today):**
   - Rotate exposed Clerk test keys
   - Update `.env.example` with placeholders

2. **This Week:**
   - Update `pdfjs-dist` to patched version
   - Add security headers to `next.config.mjs`

3. **This Month:**
   - Implement rate limiting
   - Update vulnerable dependencies
   - Re-enable TypeScript/ESLint checks

4. **Ongoing:**
   - Set up automated dependency scanning (Dependabot)
   - Regular security audits
   - Security training for development team

---

*Report generated by Claude Security Analyzer on December 7, 2025*
