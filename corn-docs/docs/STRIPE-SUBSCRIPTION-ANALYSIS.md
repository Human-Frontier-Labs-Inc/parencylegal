# Stripe Subscription Feature - Comprehensive Analysis

## Executive Summary

After thorough investigation of the codebase and research of current Stripe/Clerk/Next.js integration best practices, I've identified **multiple critical issues** preventing the subscription feature from working correctly.

---

## Issues Found

### 🔴 CRITICAL ISSUE 1: Stripe API Version Incompatibility

**File:** `lib/stripe.ts:11`

**Problem:** The API version was set to an invalid/future version that doesn't exist.

```typescript
// WRONG - This version doesn't exist
apiVersion: "2025-11-20.basil"

// CORRECT - Use valid version
apiVersion: "2024-11-20.acacia"
```

**Impact:** This causes intermittent connection failures with Stripe API, resulting in "connection to Stripe" errors.

**Status:** ✅ Fixed in previous session

---

### 🔴 CRITICAL ISSUE 2: Missing Retry Logic in Checkout Session Creation

**File:** `app/api/stripe/create-checkout/route.ts`

**Problem:** No retry mechanism for Stripe API calls. Per [Stripe NextJS Best Practices](https://nextjsstarter.com/blog/stripe-nextjs-best-practices-revealed/), you should configure:

```typescript
// Current - No retry config
export const stripe = new Stripe(stripeSecretKey || "", {
  apiVersion: "2024-11-20.acacia",
});

// Recommended
export const stripe = new Stripe(stripeSecretKey || "", {
  apiVersion: "2024-11-20.acacia",
  maxNetworkRetries: 3,
  timeout: 20000,
});
```

**Impact:** Transient network issues cause checkout to fail completely.

---

### 🔴 CRITICAL ISSUE 3: Race Condition in Webhook → UI Update Flow

**Problem:** There's a race condition between:
1. User completes Stripe checkout
2. User redirects back to `/dashboard?session_id=...`
3. Middleware redirects to `/dashboard?payment=success`
4. Payment popup tries to fetch updated profile
5. **BUT** Stripe webhook may not have fired yet!

**Evidence in code:**

```typescript
// middleware.ts:57-67 - Immediately redirects on session_id
if (req.nextUrl.pathname.startsWith('/dashboard') && req.nextUrl.search.includes('session_id')) {
  // Redirects immediately - webhook likely hasn't fired yet
  dashboardUrl.searchParams.set('payment', 'success');
  return NextResponse.redirect(dashboardUrl);
}
```

```typescript
// payment-success-popup.tsx:194-217 - Tries to fetch profile
const checkProfileUpdate = async () => {
  const success = await refreshProfileData();
  // If database still shows trial after 3 retries, uses "optimistic UI"
  // This means showing WRONG data!
```

**Impact:** Users see the popup with incorrect tier information because the database hasn't been updated yet.

---

### 🔴 CRITICAL ISSUE 4: Webhook Not Triggered for Initial Checkout

**Problem:** Per [Clerk's Stripe Metadata Guide](https://clerk.com/blog/exploring-clerk-metadata-stripe-webhooks), `checkout.session.completed` webhook should update the user profile. However, the webhook may be failing silently.

**Current webhook flow:**
1. `checkout.session.completed` fires
2. `handleCheckoutSession()` calls `updateStripeCustomer()`
3. Then calls `manageSubscriptionStatusChange()`
4. Then calls `updateProfile()` with plan details

**Potential issues:**
- No error logging if `updateProfile()` fails silently
- The `stripeCustomerId` might not be set before trying to update by it
- Webhook signature validation could be failing

---

### 🟡 ISSUE 5: Pricing Page Numbers Don't Match Popup/Webhook

**Pricing Page (`pricing-page-client.tsx`):**
```typescript
const tiers: PricingTier[] = [
  {
    name: "Solo",
    docsPerMonth: 500,  // ✓ Matches
    seats: 1,           // ✓ Matches
  },
  {
    name: "Small Firm",
    docsPerMonth: 2000, // ✓ Matches
    seats: 5,           // ✓ Matches
  },
];
```

**Webhook (`webhooks/route.ts`):**
```typescript
const PLAN_LIMITS = {
  solo: { documentLimit: 500, seatsLimit: 1 },      // ✓ Matches
  small_firm: { documentLimit: 2000, seatsLimit: 5 }, // ✓ Matches
};
```

**Popup (`payment-success-popup.tsx`):**
```typescript
const PLAN_CONFIG = {
  solo: {
    documentLimit: 500,  // ✓ Matches
    seatsLimit: 1,       // ✓ Matches
  },
  small_firm: {
    documentLimit: 2000, // ✓ Matches
    seatsLimit: 5,       // ✓ Matches
  },
};
```

**Status:** Numbers ARE aligned. The issue is the popup shows wrong data because it's reading from the **unupdated database** (see Issue 3).

---

### 🟡 ISSUE 6: No Stripe Customer Portal Integration

**Problem:** There's a customer portal route but no way for users to access it from the UI.

**File:** `app/api/stripe/customer-portal/route.ts` exists but no button in dashboard settings.

---

### 🟡 ISSUE 7: Environment Variable for App URL

**Problem:** `NEXT_PUBLIC_APP_URL` may not be set in Vercel, causing checkout URLs to break.

```typescript
// create-checkout/route.ts:46-47
success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://parencylegal.vercel.app'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
```

---

## Root Cause Analysis

### Why Checkout Session Sometimes Fails to Load

1. **Invalid API Version** (Fixed) - Was causing "connection to Stripe" errors
2. **No Retry Logic** - Network hiccups cause immediate failure
3. **Environment Variable Issues** - Missing `NEXT_PUBLIC_APP_URL`

### Why Upgrade Doesn't Persist/Show in UI

1. **Race Condition** - User redirects before webhook fires
2. **Optimistic UI Fallback** - Shows "solo" by default even if user bought "small_firm"
3. **No Webhook Verification** - System doesn't verify webhook actually succeeded
4. **Popup reads stale data** - Profile not updated when popup displays

### Why Popup Shows Wrong Numbers

1. **Database not updated yet** - Webhook hasn't fired
2. **Popup falls back to "solo"** - After 3 failed refresh attempts, defaults to solo config
3. **No real-time sync** - Need to use session info directly, not database

---

## Recommended Fixes

### Fix 1: Add Retry Logic to Stripe Client

```typescript
// lib/stripe.ts
export const stripe = new Stripe(stripeSecretKey || "", {
  apiVersion: "2024-11-20.acacia",
  maxNetworkRetries: 3,
  timeout: 20000,
  appInfo: {
    name: "Parency Legal",
    version: "0.1.0"
  }
});
```

### Fix 2: Store Checkout Session Data in URL

Instead of just `payment=success`, pass the actual plan info from the checkout session:

```typescript
// middleware.ts - After successful checkout
const sessionId = req.nextUrl.searchParams.get('session_id');
if (sessionId) {
  // Fetch session from Stripe to get plan details
  // Pass plan info in URL: /dashboard?payment=success&plan=small_firm&duration=yearly
}
```

### Fix 3: Use Session Data in Popup (Not Just Database)

```typescript
// payment-success-popup.tsx
// Read plan from URL params first, fall back to database
const planFromUrl = searchParams.get('plan');
const durationFromUrl = searchParams.get('duration');

if (planFromUrl) {
  // Use URL data immediately (reliable)
} else {
  // Fall back to database refresh (may be stale)
}
```

### Fix 4: Add Webhook Verification API

Create an endpoint to check if webhook has processed:

```typescript
// app/api/stripe/verify-subscription/route.ts
export async function GET(req: Request) {
  const { userId } = await auth();
  const profile = await getProfileByUserId(userId);
  return NextResponse.json({
    subscriptionActive: profile?.membership !== 'trial',
    membership: profile?.membership,
    updatedAt: profile?.updatedAt
  });
}
```

### Fix 5: Add Webhook Logging

```typescript
// webhooks/route.ts - Add detailed logging
console.log(`[WEBHOOK] Event received: ${event.type}`);
console.log(`[WEBHOOK] Processing for user: ${userId}`);
console.log(`[WEBHOOK] Update result: ${JSON.stringify(result)}`);
```

### Fix 6: Add NEXT_PUBLIC_APP_URL to Vercel

```bash
vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://parencylegal.vercel.app
```

---

## Implementation Priority

| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| 1 | Add retry logic to Stripe client | Low | High |
| 2 | Add NEXT_PUBLIC_APP_URL env var | Low | Medium |
| 3 | Pass plan info in success URL | Medium | High |
| 4 | Update popup to use URL params | Medium | High |
| 5 | Add webhook logging | Low | Medium |
| 6 | Add subscription verify endpoint | Medium | Medium |

---

## Testing Checklist

After implementing fixes:

- [ ] Test checkout with Solo Monthly
- [ ] Test checkout with Solo Yearly
- [ ] Test checkout with Small Firm Monthly
- [ ] Test checkout with Small Firm Yearly
- [ ] Verify webhook fires (check Stripe dashboard logs)
- [ ] Verify database updates correctly
- [ ] Verify popup shows correct plan info
- [ ] Verify dashboard reflects new membership
- [ ] Test customer portal access
- [ ] Test subscription cancellation

---

## Sources

- [Stripe Checkout with Next.js: Complete Integration Guide](https://www.mtechzilla.com/blogs/integrate-stripe-checkout-with-nextjs)
- [Exploring Clerk Metadata with Stripe Webhooks](https://clerk.com/blog/exploring-clerk-metadata-stripe-webhooks)
- [Clerk's use-stripe-subscription Package](https://github.com/clerk/use-stripe-subscription)
- [Stripe NextJS Best Practices Revealed](https://nextjsstarter.com/blog/stripe-nextjs-best-practices-revealed/)
- [Getting started with Next.js, TypeScript, and Stripe Checkout (Vercel)](https://vercel.com/kb/guide/getting-started-with-nextjs-typescript-stripe)
- [Stripe Webhook in Nextjs Issue (GitHub)](https://github.com/vercel/next.js/discussions/48885)
