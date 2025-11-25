/**
 * Dropbox OAuth Callback Route
 * GET /api/auth/dropbox/callback - Handles OAuth callback from Dropbox
 */

import { NextRequest, NextResponse } from "next/server";
import {
  validateState,
  exchangeDropboxCode
} from "@/lib/dropbox/oauth";
import { saveDropboxConnection } from "@/db/queries/dropbox-queries";

const REDIRECT_URI = process.env.DROPBOX_REDIRECT_URI ||
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/dropbox/callback`;

const SUCCESS_REDIRECT = "/dashboard/settings?dropbox=connected";
const ERROR_REDIRECT = "/dashboard/settings?dropbox=error";

/**
 * GET /api/auth/dropbox/callback
 * Handles the OAuth callback from Dropbox
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Check for OAuth errors
  const error = searchParams.get("error");
  if (error) {
    const errorDescription = searchParams.get("error_description") || "Unknown error";
    console.error("Dropbox OAuth error:", error, errorDescription);

    return NextResponse.redirect(
      new URL(`${ERROR_REDIRECT}&message=${encodeURIComponent(errorDescription)}`, request.url)
    );
  }

  // Get authorization code and state
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    console.error("Missing code or state in Dropbox callback");
    return NextResponse.redirect(
      new URL(`${ERROR_REDIRECT}&message=Invalid callback parameters`, request.url)
    );
  }

  // Validate state (CSRF protection)
  const userId = validateState(state);
  if (!userId) {
    console.error("Invalid state parameter in Dropbox callback");
    return NextResponse.json(
      { error: "Invalid state parameter. Please try connecting again." },
      { status: 400 }
    );
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeDropboxCode(code, REDIRECT_URI);

    // Save connection to database
    await saveDropboxConnection(userId, tokens);

    // Redirect to success page
    return NextResponse.redirect(new URL(SUCCESS_REDIRECT, request.url));
  } catch (error: any) {
    console.error("Error completing Dropbox OAuth:", error);

    const message = error.message || "Failed to connect Dropbox";
    return NextResponse.redirect(
      new URL(`${ERROR_REDIRECT}&message=${encodeURIComponent(message)}`, request.url)
    );
  }
}
