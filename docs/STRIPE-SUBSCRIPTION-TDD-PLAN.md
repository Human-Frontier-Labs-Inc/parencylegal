# Stripe Subscription Integration - TDD Fix Plan

## Problem Statement

Users complete Stripe checkout successfully (stripe_customer_id and stripe_subscription_id are saved), but their `membership` field remains "trial" instead of being updated to "solo" or "small_firm".

## Root Cause Analysis

### Bug Location: `actions/stripe-actions.ts:68-73`

```typescript
if (!validMemberships.includes(membership)) {
  console.error(`Invalid membership type in product metadata: ${membership}...`);
  console.log(`Defaulting to 'solo' membership for product: ${product.name}`);
  // BUG: Code logs "defaulting to solo" but NEVER ACTUALLY SETS THE DEFAULT
}
const membershipStatus = getMembershipStatus(subscription.status, membership);
// membership is still undefined/invalid, causing silent failure
```

### Data Flow Issues

1. **Product metadata retrieval**: `product.metadata.membership` returns the membership tier
2. **Validation without correction**: Invalid memberships are logged but not corrected
3. **Silent failure cascade**: Invalid enum values cause database update to fail silently
4. **Webhook returns 200**: Stripe thinks everything succeeded

## TDD Implementation Plan

### Phase 1: Write Failing Tests

Create comprehensive tests that verify the complete subscription flow.

#### Test File: `tests/stripe/subscription-flow.test.ts`

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `test_solo_subscription_updates_membership` | User subscribes to Solo plan | membership = "solo", documentLimit = 500 |
| `test_small_firm_subscription_updates_membership` | User subscribes to Small Firm | membership = "small_firm", documentLimit = 2000 |
| `test_missing_metadata_defaults_to_solo` | Product has no metadata | membership = "solo" (safe default) |
| `test_invalid_metadata_defaults_to_solo` | Product has invalid metadata | membership = "solo" (safe default) |
| `test_webhook_updates_all_plan_fields` | Checkout completed | Sets membership, documentLimit, seatsLimit, planDuration, stripePriceId |
| `test_subscription_canceled_reverts_to_trial` | Subscription canceled | membership = "trial" |

### Phase 2: Fix the Core Bug

#### Fix 1: `actions/stripe-actions.ts`

```typescript
// BEFORE (buggy)
if (!validMemberships.includes(membership)) {
  console.log(`Defaulting to 'solo'...`);
  // Does nothing!
}

// AFTER (fixed)
let finalMembership: MembershipStatus = membership;
if (!validMemberships.includes(membership)) {
  console.warn(`Invalid membership "${membership}", defaulting to "solo"`);
  finalMembership = "solo";
}
const membershipStatus = getMembershipStatus(subscription.status, finalMembership);
```

#### Fix 2: Add retry logic for database updates

```typescript
// Wrap updateProfileByStripeCustomerId with retry
const maxRetries = 3;
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    await updateProfileByStripeCustomerId(customerId, { ... });
    break;
  } catch (error) {
    if (attempt === maxRetries) throw error;
    await sleep(1000 * attempt);
  }
}
```

### Phase 3: Integration Tests

#### Test Webhook Endpoint Directly

```typescript
// tests/stripe/webhook-integration.test.ts
describe('Stripe Webhook Handler', () => {
  it('processes checkout.session.completed and updates profile', async () => {
    const mockEvent = createMockStripeEvent('checkout.session.completed', {
      client_reference_id: 'user_test123',
      customer: 'cus_test123',
      subscription: 'sub_test123'
    });

    const response = await POST(new Request('/api/stripe/webhooks', {
      method: 'POST',
      body: JSON.stringify(mockEvent),
      headers: { 'Stripe-Signature': generateSignature(mockEvent) }
    }));

    expect(response.status).toBe(200);

    // Verify database was updated
    const profile = await getProfileByUserId('user_test123');
    expect(profile.membership).toBe('solo');
    expect(profile.documentLimit).toBe(500);
  });
});
```

### Phase 4: Manual Verification

1. **Create test user in Clerk**
2. **Subscribe via Stripe test mode**
3. **Check database for correct membership**
4. **Verify webhook logs show success**

### Phase 5: Fix Existing Users

Create a migration script to fix users who already subscribed but have wrong membership:

```typescript
// scripts/fix-subscribed-users.ts
async function fixSubscribedUsers() {
  // Find users with stripe_subscription_id but membership = 'trial'
  const brokenUsers = await db.select()
    .from(profilesTable)
    .where(and(
      isNotNull(profilesTable.stripeSubscriptionId),
      eq(profilesTable.membership, 'trial')
    ));

  for (const user of brokenUsers) {
    // Fetch subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    const productId = subscription.items.data[0].price.product as string;
    const product = await stripe.products.retrieve(productId);
    const membership = product.metadata.membership || 'solo';

    // Fix the user's membership
    await updateProfile(user.userId, {
      membership,
      documentLimit: PLAN_LIMITS[membership].documentLimit,
      seatsLimit: PLAN_LIMITS[membership].seatsLimit
    });

    console.log(`Fixed user ${user.userId}: ${user.membership} -> ${membership}`);
  }
}
```

## Implementation Checklist

- [ ] **Phase 1**: Write failing tests
  - [ ] Create `tests/stripe/subscription-flow.test.ts`
  - [ ] Create mock Stripe event helpers
  - [ ] Run tests (should fail)

- [ ] **Phase 2**: Fix core bugs
  - [ ] Fix `manageSubscriptionStatusChange` to actually default to "solo"
  - [ ] Add better error handling and logging
  - [ ] Run tests (should pass)

- [ ] **Phase 3**: Integration tests
  - [ ] Test webhook endpoint with mock events
  - [ ] Verify database state after webhook

- [ ] **Phase 4**: Manual verification
  - [ ] Test real Stripe checkout flow
  - [ ] Verify database updates correctly

- [ ] **Phase 5**: Fix existing users
  - [ ] Run migration script for users with broken memberships
  - [ ] Verify all subscribed users have correct membership

## Success Criteria

1. All tests pass
2. New subscriptions correctly update membership field
3. Existing broken users are fixed
4. Webhook logs show successful processing
5. No silent failures in subscription flow
