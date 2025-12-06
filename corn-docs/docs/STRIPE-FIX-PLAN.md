# Stripe Integration Fix Plan

## Overview
This document outlines a phased approach to fix all Stripe integration issues identified in the Parency Legal application.

**Total Estimated Phases:** 4
**Dependencies:** Stripe CLI, Vercel CLI, Database access

**Status:** ✅ Phases 1-3 COMPLETED | Phase 4 Ready for Testing

---

## Phase 1: Stripe Dashboard Configuration (External) ✅ COMPLETED
**Priority:** 🔴 Critical
**Risk Level:** Low (no code changes)
**Status:** ✅ Completed on 2025-12-04

### 1.1 Add Product Metadata ✅
Added the required `membership` metadata to each Stripe product.

**Verified Configuration:**
- `prod_TXal3elFN0zTEj` (Solo): `metadata.membership = "solo"` ✅
- `prod_TXamj5qNf2Z7W8` (Small Firm): `metadata.membership = "small_firm"` ✅

### 1.2 Fix Webhook Event Configuration ✅
Updated webhook endpoint with all required events.

**Verified Configuration (`we_1SaVbMFIF4eQWN8vkIGahpqZ`):**
- `checkout.session.completed` ✅
- `customer.subscription.updated` ✅
- `customer.subscription.deleted` ✅
- `invoice.payment_succeeded` ✅
- `invoice.payment_failed` ✅

### 1.3 Verification Checklist
- [x] Solo product has `metadata.membership = "solo"`
- [x] Small Firm product has `metadata.membership = "small_firm"`
- [x] Webhook includes `invoice.payment_succeeded` event
- [ ] Test webhook endpoint is responding (check Stripe dashboard)

---

## Phase 2: Environment Variables Fix
**Priority:** 🔴 Critical
**Risk Level:** Medium (affects production)

### 2.1 Update Local Environment Variables
Update `.env.local` with correct Stripe price IDs:

```env
# Correct Stripe Price IDs (from current Stripe account)
NEXT_PUBLIC_STRIPE_PRICE_ID_SOLO_MONTHLY=price_1SaVaMFIF4eQWN8v0xCet3Zy
NEXT_PUBLIC_STRIPE_PRICE_ID_SOLO_YEARLY=price_1SaVaUFIF4eQWN8v7GjsaGqx
NEXT_PUBLIC_STRIPE_PRICE_ID_FIRM_MONTHLY=price_1SaVarFIF4eQWN8v6bPJhUET
NEXT_PUBLIC_STRIPE_PRICE_ID_FIRM_YEARLY=price_1SaVayFIF4eQWN8vPEHUnMRz
```

### 2.2 Fix Webhook Secret Formatting
Remove trailing `\n` characters from environment variables in `.env.production.local`.

**Before:**
```
STRIPE_WEBHOOK_SECRET="whsec_YDyGHXiQ7ye8DlMYfEI1ck0nrDtRf3pP\n"
```

**After:**
```
STRIPE_WEBHOOK_SECRET=whsec_YDyGHXiQ7ye8DlMYfEI1ck0nrDtRf3pP
```

### 2.3 Update Vercel Environment Variables
Sync the corrected environment variables to Vercel:

```bash
# Update each variable in Vercel
vercel env rm NEXT_PUBLIC_STRIPE_PRICE_ID_SOLO_MONTHLY production
vercel env add NEXT_PUBLIC_STRIPE_PRICE_ID_SOLO_MONTHLY production

# Repeat for all price IDs and webhook secret
```

### 2.4 Verification Checklist
- [ ] `.env.local` has correct price IDs
- [ ] `.env.production.local` has no trailing `\n` characters
- [ ] Vercel environment variables are updated
- [ ] Trigger a new deployment to apply changes

---

## Phase 3: Code Fixes
**Priority:** 🔴 Critical
**Risk Level:** Medium

### 3.1 Fix Undefined Variable in Webhook Handler
**File:** `app/api/stripe/webhooks/route.ts`

Add missing constant at the top of the file:

```typescript
// Add after line 23 (after PLAN_LIMITS definition)
const DEFAULT_USAGE_CREDITS = 1000;
```

### 3.2 Clean Up Unused Field References
**File:** `db/queries/profiles-queries.ts`

Remove references to fields that don't exist in the schema:

**Function `getUserPlanInfo` (lines 268-292):**
- Remove `usageCredits` reference
- Remove `usedCredits` reference

**Function `getProfileByWhopUserId` (lines 168-220):**
- Either remove entirely or comment out (it's marked as deprecated)

**Function `updateProfileByWhopUserId` (lines 99-166):**
- Either remove entirely or comment out (it's marked as deprecated)

### 3.3 Update Payment Success Popup
**File:** `components/payment-success-popup.tsx`

Update to work with new membership tiers (`solo`, `small_firm`, `enterprise`) instead of `pro`.

### 3.4 Verification Checklist
- [ ] `DEFAULT_USAGE_CREDITS` is defined in webhook handler
- [ ] No TypeScript errors after removing unused references
- [ ] Payment success popup displays correct tier information
- [ ] All tests pass (`npm run test`)

---

## Phase 4: Testing & Validation
**Priority:** 🔴 Critical
**Risk Level:** Low

### 4.1 Local Testing with Stripe CLI
```bash
# Start webhook forwarding
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# In another terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

### 4.2 Test Checkout Flow
1. Start local development server: `npm run dev`
2. Navigate to `/pricing`
3. Click "Start Free Trial" on Solo plan
4. Complete checkout with test card: `4242 4242 4242 4242`
5. Verify:
   - [ ] Redirected to `/dashboard?payment=success`
   - [ ] Payment success popup appears
   - [ ] Profile updated with correct `membership` value
   - [ ] `stripeCustomerId` and `stripeSubscriptionId` saved

### 4.3 Test Webhook Processing
After completing checkout, verify in database:
```sql
SELECT
  user_id,
  membership,
  stripe_customer_id,
  stripe_subscription_id,
  stripe_price_id,
  plan_duration,
  document_limit,
  seats_limit
FROM profiles
WHERE stripe_customer_id IS NOT NULL
ORDER BY updated_at DESC
LIMIT 1;
```

### 4.4 Test Subscription Management
1. Navigate to `/api/stripe/customer-portal`
2. Verify redirect to Stripe Customer Portal
3. Test cancellation flow
4. Verify webhook updates membership to `trial`

### 4.5 Production Deployment Checklist
- [ ] All local tests pass
- [ ] Environment variables synced to Vercel
- [ ] Deploy to production: `vercel --prod`
- [ ] Test live checkout with test mode
- [ ] Monitor Stripe webhook logs for errors

---

## Execution Order

```
Phase 1 (Stripe Dashboard) ──┐
                             ├──▶ Phase 3 (Code Fixes) ──▶ Phase 4 (Testing)
Phase 2 (Environment Vars) ──┘
```

Phases 1 and 2 can be done in parallel. Phase 3 depends on Phase 1 & 2 completion. Phase 4 validates everything.

---

## Rollback Plan

If issues arise after deployment:

1. **Revert code changes:**
   ```bash
   git revert HEAD
   git push
   ```

2. **Restore environment variables:**
   Keep a backup of current working env vars before making changes.

3. **Stripe webhook:**
   Webhook changes can be reverted via Stripe dashboard.

---

## Success Criteria

✅ Users can complete checkout for Solo and Small Firm plans
✅ Webhooks correctly update user profiles with membership tier
✅ Payment success popup shows correct plan information
✅ Customer portal accessible for subscription management
✅ Payment failure handling works correctly
✅ No console errors or TypeScript warnings

---

## Files Modified

| File | Changes |
|------|---------|
| `.env.local` | Update price IDs |
| `.env.production.local` | Fix formatting, update price IDs |
| `app/api/stripe/webhooks/route.ts` | Add DEFAULT_USAGE_CREDITS |
| `db/queries/profiles-queries.ts` | Remove unused field references |
| `components/payment-success-popup.tsx` | Update for new tiers |

---

## Contact & Resources

- **Stripe Dashboard:** https://dashboard.stripe.com
- **Stripe Webhook Logs:** https://dashboard.stripe.com/webhooks
- **Vercel Dashboard:** https://vercel.com/dashboard
