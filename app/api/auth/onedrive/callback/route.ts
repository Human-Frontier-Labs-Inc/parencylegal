/**
 * OneDrive OAuth Callback Route
 * GET /api/auth/onedrive/callback - Handles OAuth callback from Microsoft
 */

import { NextRequest, NextResponse } from "next/server";
import { OneDriveProvider } from "@/lib/cloud-storage/providers/onedrive";
import { saveOnedriveConnection } from "@/db/queries/onedrive-queries";

const REDIRECT_URI = process.env.ONEDRIVE_REDIRECT_URI ||
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/onedrive/callback`;

const SUCCESS_REDIRECT = "/dashboard/settings?onedrive=connected";
const ERROR_REDIRECT = "/dashboard/settings?onedrive=error";

/**
 * GET /api/auth/onedrive/callback
 * Handles the OAuth callback from Microsoft
 */
export async function GET(request: NextRequest) {
  console.log("OneDrive callback received");
  console.log("REDIRECT_URI:", REDIRECT_URI);

  const searchParams = request.nextUrl.searchParams;

  // Check for OAuth errors
  const error = searchParams.get("error");
  if (error) {
    const errorDescription = searchParams.get("error_description") || "Unknown error";
    console.error("OneDrive OAuth error:", error, errorDescription);

    return NextResponse.redirect(
      new URL(`${ERROR_REDIRECT}&message=${encodeURIComponent(errorDescription)}`, request.url)
    );
  }

  // Get authorization code and state
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  console.log("Code received:", code ? "yes" : "no");
  console.log("State received:", state ? "yes" : "no");

  if (!code || !state) {
    console.error("Missing code or state in OneDrive callback");
    return NextResponse.redirect(
      new URL(`${ERROR_REDIRECT}&message=Invalid callback parameters`, request.url)
    );
  }

  // Validate state (CSRF protection)
  const provider = new OneDriveProvider();
  const userId = provider.validateState(state);
  console.log("UserId from state:", userId ? "found" : "not found");

  if (!userId) {
    console.error("Invalid state parameter in OneDrive callback");
    return NextResponse.redirect(
      new URL(`${ERROR_REDIRECT}&message=Invalid state. Please try again.`, request.url)
    );
  }

  try {
    console.log("Exchanging code for tokens...");
    // Exchange code for tokens
    const tokens = await provider.exchangeCode(code, REDIRECT_URI);
    console.log("Tokens received, account_id:", tokens.accountId);

    // Get account info
    const accountInfo = await provider.getAccountInfo(tokens.accessToken);
    console.log("Account info received:", accountInfo.email);

    console.log("Saving connection to database...");
    // Save connection to database
    await saveOnedriveConnection(userId, tokens, accountInfo);
    console.log("Connection saved successfully");

    // Redirect to success page
    const successUrl = new URL(SUCCESS_REDIRECT, request.url);
    console.log("Redirecting to:", successUrl.toString());
    return NextResponse.redirect(successUrl);
  } catch (error: any) {
    console.error("Error completing OneDrive OAuth:", error);
    console.error("Error stack:", error.stack);

    const message = error.message || "Failed to connect OneDrive";
    return NextResponse.redirect(
      new URL(`${ERROR_REDIRECT}&message=${encodeURIComponent(message)}`, request.url)
    );
  }
}
