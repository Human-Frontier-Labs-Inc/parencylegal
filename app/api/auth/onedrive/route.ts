/**
 * OneDrive OAuth Initiation Route
 * GET /api/auth/onedrive - Initiates OAuth flow by redirecting to Microsoft
 * DELETE /api/auth/onedrive - Disconnects OneDrive account
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OneDriveProvider } from "@/lib/cloud-storage/providers/onedrive";
import { disconnectOnedrive, getOnedriveConnectionStatus } from "@/db/queries/onedrive-queries";

const REDIRECT_URI = process.env.ONEDRIVE_REDIRECT_URI ||
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/onedrive/callback`;

/**
 * GET /api/auth/onedrive
 * Initiates OneDrive OAuth flow
 */
export async function GET(request: NextRequest) {
  console.log("OneDrive OAuth initiation started");
  console.log("ONEDRIVE_CLIENT_ID exists:", !!process.env.ONEDRIVE_CLIENT_ID);
  console.log("ONEDRIVE_CLIENT_SECRET exists:", !!process.env.ONEDRIVE_CLIENT_SECRET);
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

    // Check if OneDrive credentials are configured
    if (!process.env.ONEDRIVE_CLIENT_ID || !process.env.ONEDRIVE_CLIENT_SECRET) {
      console.log("OneDrive credentials missing");
      return NextResponse.json(
        { error: "OneDrive integration not configured" },
        { status: 503 }
      );
    }

    console.log("Generating auth URL...");
    // Generate authorization URL using the provider
    const provider = new OneDriveProvider();
    const authUrl = provider.getAuthUrl(userId, REDIRECT_URI);
    console.log("Auth URL generated:", authUrl.substring(0, 100) + "...");

    // Redirect to Microsoft
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Error initiating OneDrive OAuth:", error);
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { error: "Failed to initiate OneDrive connection: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/onedrive
 * Disconnects OneDrive account
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

    const result = await disconnectOnedrive(userId);

    if (!result) {
      return NextResponse.json(
        { error: "No OneDrive connection found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OneDrive disconnected successfully",
    });
  } catch (error) {
    console.error("Error disconnecting OneDrive:", error);
    return NextResponse.json(
      { error: "Failed to disconnect OneDrive" },
      { status: 500 }
    );
  }
}
