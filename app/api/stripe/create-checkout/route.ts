import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Create Stripe instance directly in this file to avoid module initialization issues
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    maxNetworkRetries: 2,
    timeout: 30000,
  });
}

export async function POST(req: Request) {
  console.log("[CHECKOUT] Starting checkout session creation...");

  try {
    // Check if Stripe is configured
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.error("[CHECKOUT] STRIPE_SECRET_KEY is not configured");
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }

    console.log("[CHECKOUT] STRIPE_SECRET_KEY is configured, length:", secretKey.length);
    console.log("[CHECKOUT] Key prefix:", secretKey.substring(0, 10) + "...");

    const { userId } = await auth();
    console.log("[CHECKOUT] User ID from auth:", userId);

    if (!userId) {
      console.log("[CHECKOUT] No userId - returning 401");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { priceId } = body;
    console.log("[CHECKOUT] Request body:", JSON.stringify(body));

    if (!priceId) {
      console.log("[CHECKOUT] No priceId - returning 400");
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    console.log("[CHECKOUT] Creating checkout session with priceId:", priceId);
    console.log("[CHECKOUT] Success URL:", `${process.env.NEXT_PUBLIC_APP_URL || 'https://parencylegal.vercel.app'}/dashboard?session_id={CHECKOUT_SESSION_ID}`);

    // Initialize Stripe fresh for each request
    const stripe = getStripe();

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://parencylegal.vercel.app'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://parencylegal.vercel.app'}/pricing`,
      client_reference_id: userId,
      metadata: {
        userId,
      },
    });

    console.log("[CHECKOUT] Session created successfully:", session.id);
    console.log("[CHECKOUT] Session URL:", session.url);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("[CHECKOUT] Error creating checkout session:");
    console.error("[CHECKOUT] Error type:", error?.type);
    console.error("[CHECKOUT] Error code:", error?.code);
    console.error("[CHECKOUT] Error message:", error?.message);
    console.error("[CHECKOUT] Error raw:", error?.raw);
    console.error("[CHECKOUT] Full error:", JSON.stringify(error, null, 2));

    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
