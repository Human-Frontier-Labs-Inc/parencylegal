/**
 * Fix Subscribed Users Script
 *
 * This script finds users who have a Stripe subscription but their membership
 * is still set to "trial". It fetches the correct membership from Stripe and
 * updates their profile.
 *
 * Run with: npx tsx scripts/fix-subscribed-users.ts
 */

import { db } from "@/db/db";
import { profilesTable } from "@/db/schema/profiles-schema";
import { eq, and, isNotNull } from "drizzle-orm";
import Stripe from "stripe";

// Plan limits based on membership tier
const PLAN_LIMITS = {
  solo: { documentLimit: 500, seatsLimit: 1 },
  small_firm: { documentLimit: 2000, seatsLimit: 5 },
  enterprise: { documentLimit: 999999, seatsLimit: 999 },
  trial: { documentLimit: 100, seatsLimit: 1 }
} as const;

type MembershipType = keyof typeof PLAN_LIMITS;

async function fixSubscribedUsers() {
  console.log("🔧 Starting fix for subscribed users with wrong membership...\n");

  // Initialize Stripe
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error("❌ STRIPE_SECRET_KEY is not set");
    process.exit(1);
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2024-06-20"
  });

  // Find users with stripe_subscription_id but membership = 'trial'
  const brokenUsers = await db.select()
    .from(profilesTable)
    .where(and(
      isNotNull(profilesTable.stripeSubscriptionId),
      eq(profilesTable.membership, "trial")
    ));

  console.log(`📊 Found ${brokenUsers.length} users with subscriptions still marked as 'trial'\n`);

  if (brokenUsers.length === 0) {
    console.log("✅ No users need fixing!");
    return;
  }

  let fixed = 0;
  let errors = 0;

  for (const user of brokenUsers) {
    try {
      console.log(`\n👤 Processing user: ${user.userId}`);
      console.log(`   Current membership: ${user.membership}`);
      console.log(`   Stripe Subscription ID: ${user.stripeSubscriptionId}`);

      if (!user.stripeSubscriptionId) {
        console.log(`   ⚠️ Skipping - no subscription ID`);
        continue;
      }

      // Fetch subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

      if (subscription.status !== "active" && subscription.status !== "trialing") {
        console.log(`   ⚠️ Subscription status is "${subscription.status}" - setting to trial`);
        await db.update(profilesTable)
          .set({
            membership: "trial",
            documentLimit: PLAN_LIMITS.trial.documentLimit,
            seatsLimit: PLAN_LIMITS.trial.seatsLimit,
            status: subscription.status
          })
          .where(eq(profilesTable.userId, user.userId));
        continue;
      }

      const productId = subscription.items.data[0].price.product as string;
      const product = await stripe.products.retrieve(productId);

      // Get membership from product metadata, default to solo
      let membership = (product.metadata.membership || "solo") as MembershipType;

      // Validate membership
      const validMemberships: MembershipType[] = ["trial", "solo", "small_firm", "enterprise"];
      if (!validMemberships.includes(membership)) {
        console.log(`   ⚠️ Invalid membership in product metadata: ${membership}, defaulting to solo`);
        membership = "solo";
      }

      const planLimits = PLAN_LIMITS[membership];

      // Get price interval for plan duration
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      const planDuration = price.recurring?.interval === "year" ? "yearly" : "monthly";

      console.log(`   📦 Product: ${product.name}`);
      console.log(`   🎯 Correct membership: ${membership}`);
      console.log(`   📅 Plan duration: ${planDuration}`);
      console.log(`   📄 Document limit: ${planLimits.documentLimit}`);

      // Update the user's profile
      await db.update(profilesTable)
        .set({
          membership,
          stripePriceId: priceId,
          planDuration,
          documentLimit: planLimits.documentLimit,
          seatsLimit: planLimits.seatsLimit,
          status: "active",
          billingCycleStart: new Date(subscription.current_period_start * 1000),
          billingCycleEnd: new Date(subscription.current_period_end * 1000)
        })
        .where(eq(profilesTable.userId, user.userId));

      console.log(`   ✅ Fixed: ${user.membership} -> ${membership}`);
      fixed++;

    } catch (error) {
      console.error(`   ❌ Error fixing user ${user.userId}:`, error);
      errors++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`📊 Summary:`);
  console.log(`   ✅ Fixed: ${fixed} users`);
  console.log(`   ❌ Errors: ${errors} users`);
  console.log("=".repeat(50));
}

// Run the script
fixSubscribedUsers()
  .then(() => {
    console.log("\n🎉 Script completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error);
    process.exit(1);
  });
