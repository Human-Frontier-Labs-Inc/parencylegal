import Stripe from "stripe";

// Get Stripe secret key directly from environment
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error("STRIPE_SECRET_KEY is not configured");
}

export const stripe = new Stripe(stripeSecretKey || "", {
  apiVersion: "2024-11-20.acacia",
  // Retry configuration for reliability
  maxNetworkRetries: 3,
  timeout: 20000, // 20 seconds
  appInfo: {
    name: "Parency Legal",
    version: "0.1.0"
  }
});

// Helper to get checkout session with plan details
export async function getCheckoutSessionWithPlanDetails(sessionId: string) {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "subscription.items.data.price.product"]
    });

    if (!session.subscription || typeof session.subscription === "string") {
      return null;
    }

    const subscription = session.subscription as Stripe.Subscription;
    const priceItem = subscription.items.data[0];
    const product = priceItem?.price?.product as Stripe.Product;
    const price = priceItem?.price;

    return {
      sessionId: session.id,
      customerId: session.customer as string,
      subscriptionId: subscription.id,
      membership: product?.metadata?.membership || "solo",
      productName: product?.name || "Solo",
      priceId: price?.id,
      planDuration: price?.recurring?.interval === "year" ? "yearly" : "monthly",
      billingCycleEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    };
  } catch (error) {
    console.error("Error fetching checkout session details:", error);
    return null;
  }
}
