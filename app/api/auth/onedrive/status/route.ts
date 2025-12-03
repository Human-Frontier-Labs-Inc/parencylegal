/**
 * OneDrive Connection Status Route
 * GET /api/auth/onedrive/status - Returns connection status
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOnedriveConnectionStatus } from "@/db/queries/onedrive-queries";

/**
 * GET /api/auth/onedrive/status
 * Returns the OneDrive connection status for the authenticated user
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

    const status = await getOnedriveConnectionStatus(userId);

    if (!status) {
      return NextResponse.json(
        { error: "Failed to get connection status" },
        { status: 500 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error getting OneDrive status:", error);
    return NextResponse.json(
      { error: "Failed to get OneDrive status" },
      { status: 500 }
    );
  }
}
