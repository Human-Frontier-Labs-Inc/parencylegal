/**
 * Dropbox Connection Status Route
 * GET /api/auth/dropbox/status - Returns connection status
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDropboxConnectionStatus } from "@/db/queries/dropbox-queries";

/**
 * GET /api/auth/dropbox/status
 * Returns the Dropbox connection status for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const status = await getDropboxConnectionStatus(userId);

    if (!status) {
      return NextResponse.json(
        { error: "Failed to get connection status" },
        { status: 500 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error getting Dropbox status:", error);
    return NextResponse.json(
      { error: "Failed to get Dropbox status" },
      { status: 500 }
    );
  }
}
