import { manageSubscriptionStatusChange, updateStripeCustomer } from "@/actions/stripe-actions";
import { stripe } from "@/lib/stripe";
import { headers } from "next/headers";
import Stripe from "stripe";
import { updateProfile, updateProfileByStripeCustomerId } from "@/db/queries/profiles-queries";

const relevantEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed"
]);

// Plan limits based on membership tier
const PLAN_LIMITS = {
  solo: { documentLimit: 500, seatsLimit: 1 },
  small_firm: { documentLimit: 2000, seatsLimit: 5 },
  enterprise: { documentLimit: 999999, seatsLimit: 999 }, // Effectively unlimited
  trial: { documentLimit: 100, seatsLimit: 1 }
} as const;

type MembershipType = keyof typeof PLAN_LIMITS;

// Default document credits for billing cycle reset
const DEFAULT_DOCUMENT_CREDITS = 500; // Solo default, will be overridden by plan limits

export async function POST(req: Request) {
  console.log("[WEBHOOK] ====== Stripe webhook received ======");

  const body = await req.text();
  const sig = headers().get("Stripe-Signature") as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event: Stripe.Event;

  try {
    if (!sig || !webhookSecret) {
      console.error("[WEBHOOK] Missing signature or webhook secret");
      throw new Error("Webhook secret or signature missing");
    }

    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    console.log(`[WEBHOOK] Event verified: ${event.type} (${event.id})`);
  } catch (err: any) {
    console.error(`[WEBHOOK] Verification Error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (relevantEvents.has(event.type)) {
    console.log(`[WEBHOOK] Processing relevant event: ${event.type}`);
    try {
      switch (event.type) {
        case "customer.subscription.updated":
        case "customer.subscription.deleted":
          console.log(`[WEBHOOK] Handling subscription change...`);
          await handleSubscriptionChange(event);
          break;

        case "checkout.session.completed":
          console.log(`[WEBHOOK] Handling checkout session completed...`);
          await handleCheckoutSession(event);
          break;

        case "invoice.payment_succeeded":
          console.log(`[WEBHOOK] Handling payment success...`);
          await handlePaymentSuccess(event);
          break;

        case "invoice.payment_failed":
          console.log(`[WEBHOOK] Handling payment failure...`);
          await handlePaymentFailed(event);
          break;

        default:
          throw new Error("Unhandled relevant event!");
      }
      console.log(`[WEBHOOK] Successfully processed: ${event.type}`);
    } catch (error) {
      console.error(`[WEBHOOK] Handler failed for ${event.type}:`, error);
      return new Response("Webhook handler failed. View your nextjs function logs.", {
        status: 400
      });
    }
  } else {
    console.log(`[WEBHOOK] Ignoring event: ${event.type}`);
  }

  console.log("[WEBHOOK] ====== Webhook processing complete ======");
  return new Response(JSON.stringify({ received: true }));
}

async function handleSubscriptionChange(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const productId = subscription.items.data[0].price.product as string;
  await manageSubscriptionStatusChange(subscription.id, subscription.customer as string, productId);
}

async function handleCheckoutSession(event: Stripe.Event) {
  const checkoutSession = event.data.object as Stripe.Checkout.Session;

  console.log(`[WEBHOOK:CHECKOUT] Session ID: ${checkoutSession.id}`);
  console.log(`[WEBHOOK:CHECKOUT] Mode: ${checkoutSession.mode}`);
  console.log(`[WEBHOOK:CHECKOUT] Client Reference ID (userId): ${checkoutSession.client_reference_id}`);
  console.log(`[WEBHOOK:CHECKOUT] Customer: ${checkoutSession.customer}`);
  console.log(`[WEBHOOK:CHECKOUT] Subscription: ${checkoutSession.subscription}`);

  if (checkoutSession.mode === "subscription") {
    const subscriptionId = checkoutSession.subscription as string;
    const userId = checkoutSession.client_reference_id as string;
    const customerId = checkoutSession.customer as string;

    console.log(`[WEBHOOK:CHECKOUT] Step 1: Updating Stripe customer info...`);
    await updateStripeCustomer(userId, subscriptionId, customerId);
    console.log(`[WEBHOOK:CHECKOUT] Step 1 complete: Stripe customer updated`);

    console.log(`[WEBHOOK:CHECKOUT] Step 2: Retrieving subscription details...`);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["default_payment_method"]
    });

    const productId = subscription.items.data[0].price.product as string;
    console.log(`[WEBHOOK:CHECKOUT] Product ID: ${productId}`);

    console.log(`[WEBHOOK:CHECKOUT] Step 3: Managing subscription status change...`);
    const membershipStatus = await manageSubscriptionStatusChange(subscription.id, customerId, productId);
    console.log(`[WEBHOOK:CHECKOUT] Step 3 complete: Membership status = ${membershipStatus}`);

    // Get the product to determine membership type from metadata
    console.log(`[WEBHOOK:CHECKOUT] Step 4: Retrieving product metadata...`);
    const product = await stripe.products.retrieve(productId);
    const membershipType = (product.metadata.membership || "solo") as MembershipType;
    const planLimits = PLAN_LIMITS[membershipType] || PLAN_LIMITS.solo;
    console.log(`[WEBHOOK:CHECKOUT] Product: ${product.name}, Membership from metadata: ${product.metadata.membership || 'NOT SET'}`);
    console.log(`[WEBHOOK:CHECKOUT] Using membership type: ${membershipType}, Limits: ${JSON.stringify(planLimits)}`);

    // Determine plan duration from price interval
    const priceId = subscription.items.data[0].price.id;
    const price = await stripe.prices.retrieve(priceId);
    const planDuration = price.recurring?.interval === "year" ? "yearly" : "monthly";
    console.log(`[WEBHOOK:CHECKOUT] Price ID: ${priceId}, Duration: ${planDuration}`);

    // Update profile with plan details and limits
    if (userId) {
      try {
        const billingCycleStart = new Date(subscription.current_period_start * 1000);
        const billingCycleEnd = new Date(subscription.current_period_end * 1000);

        console.log(`[WEBHOOK:CHECKOUT] Step 5: Updating user profile...`);
        console.log(`[WEBHOOK:CHECKOUT] User ID: ${userId}`);
        console.log(`[WEBHOOK:CHECKOUT] Update data: membership=${membershipType}, planDuration=${planDuration}, documentLimit=${planLimits.documentLimit}, seatsLimit=${planLimits.seatsLimit}`);

        const updatedProfile = await updateProfile(userId, {
          status: "active",
          membership: membershipType,
          stripePriceId: priceId,
          planDuration,
          billingCycleStart,
          billingCycleEnd,
          documentLimit: planLimits.documentLimit,
          seatsLimit: planLimits.seatsLimit,
          documentsProcessedThisMonth: 0 // Reset on new subscription
        });

        console.log(`[WEBHOOK:CHECKOUT] Step 5 complete: Profile updated successfully`);
        console.log(`[WEBHOOK:CHECKOUT] Updated profile:`, JSON.stringify(updatedProfile, null, 2));
      } catch (error) {
        console.error(`[WEBHOOK:CHECKOUT] ERROR updating profile:`, error);
        throw error; // Re-throw to trigger webhook retry
      }
    } else {
      console.error(`[WEBHOOK:CHECKOUT] ERROR: No client_reference_id (userId) in checkout session!`);
    }
  } else {
    console.log(`[WEBHOOK:CHECKOUT] Skipping - not a subscription checkout (mode=${checkoutSession.mode})`);
  }
}

async function handlePaymentSuccess(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;
  
  if (invoice.subscription) {
    try {
      // Get the subscription to determine billing cycle dates
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      
      const billingCycleStart = new Date(subscription.current_period_start * 1000);
      const billingCycleEnd = new Date(subscription.current_period_end * 1000);
      
      // TODO: Phase 2+ - Implement document credits system
      // Update profile directly by Stripe customer ID
      await updateProfileByStripeCustomerId(customerId, {
        status: "active",
        billingCycleStart,
        billingCycleEnd
      });
      
      console.log(`Updated billing cycle for Stripe customer ${customerId}`);
    } catch (error) {
      console.error(`Error processing payment success: ${error}`);
    }
  }
}

async function handlePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;
  
  try {
    // Update profile directly by Stripe customer ID
    const updatedProfile = await updateProfileByStripeCustomerId(customerId, {
      status: "payment_failed"
    });
    
    if (updatedProfile) {
      console.log(`Marked payment as failed for user ${updatedProfile.userId}`);
    } else {
      console.error(`No profile found for Stripe customer: ${customerId}`);
    }
  } catch (error) {
    console.error(`Error processing payment failure: ${error}`);
  }
}
