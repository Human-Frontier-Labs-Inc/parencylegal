import Stripe from "stripe";

// Get Stripe secret key directly from environment
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error("STRIPE_SECRET_KEY is not configured");
}

export const stripe = new Stripe(stripeSecretKey || "", {
  apiVersion: "2024-06-20",
  appInfo: {
    name: "Parency Lawyer App",
    version: "0.1.0"
  }
});
