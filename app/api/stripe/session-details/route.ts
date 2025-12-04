import { NextResponse } from "next/server";
import { getCheckoutSessionWithPlanDetails } from "@/lib/stripe";

/**
 * GET /api/stripe/session-details?session_id=xxx
 *
 * Fetches checkout session details directly from Stripe.
 * Used to get accurate plan info immediately after checkout,
 * without waiting for webhook to update database.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id is required" },
        { status: 400 }
      );
    }

    console.log(`[SESSION-DETAILS] Fetching details for session: ${sessionId}`);

    const details = await getCheckoutSessionWithPlanDetails(sessionId);

    if (!details) {
      console.error(`[SESSION-DETAILS] No details found for session: ${sessionId}`);
      return NextResponse.json(
        { error: "Session not found or not a subscription" },
        { status: 404 }
      );
    }

    console.log(`[SESSION-DETAILS] Found: membership=${details.membership}, duration=${details.planDuration}`);

    return NextResponse.json(details);
  } catch (error: any) {
    console.error("[SESSION-DETAILS] Error:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
