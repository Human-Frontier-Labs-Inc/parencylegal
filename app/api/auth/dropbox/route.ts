/**
 * Dropbox OAuth Initiation Route
 * GET /api/auth/dropbox - Initiates OAuth flow by redirecting to Dropbox
 * DELETE /api/auth/dropbox - Disconnects Dropbox account
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateDropboxAuthUrl } from "@/lib/dropbox/oauth";
import { disconnectDropbox, getDropboxConnectionStatus } from "@/db/queries/dropbox-queries";

const REDIRECT_URI = process.env.DROPBOX_REDIRECT_URI ||
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/dropbox/callback`;

/**
 * GET /api/auth/dropbox
 * Initiates Dropbox OAuth flow
 */
export async function GET(request: NextRequest) {
  console.log("Dropbox OAuth initiation started");
  console.log("DROPBOX_APP_KEY exists:", !!process.env.DROPBOX_APP_KEY);
  console.log("DROPBOX_APP_SECRET exists:", !!process.env.DROPBOX_APP_SECRET);
  console.log("REDIRECT_URI:", REDIRECT_URI);

  try {
    const { userId } = await auth();
    console.log("User ID:", userId ? "found" : "not found");

    if (!userId) {
      console.log("No userId, returning 401");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if Dropbox credentials are configured
    if (!process.env.DROPBOX_APP_KEY || !process.env.DROPBOX_APP_SECRET) {
      console.log("Dropbox credentials missing");
      return NextResponse.json(
        { error: "Dropbox integration not configured" },
        { status: 503 }
      );
    }

    console.log("Generating auth URL...");
    // Generate authorization URL
    const authUrl = generateDropboxAuthUrl(userId, REDIRECT_URI);
    console.log("Auth URL generated:", authUrl.substring(0, 100) + "...");

    // Redirect to Dropbox
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Error initiating Dropbox OAuth:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { error: "Failed to initiate Dropbox connection: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/dropbox
 * Disconnects Dropbox account
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await disconnectDropbox(userId);

    if (!result) {
      return NextResponse.json(
        { error: "No Dropbox connection found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Dropbox disconnected successfully",
    });
  } catch (error) {
    console.error("Error disconnecting Dropbox:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Dropbox" },
      { status: 500 }
    );
  }
}
