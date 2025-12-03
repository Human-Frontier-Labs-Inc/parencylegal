/**
 * OneDrive Folder Search API Route
 * GET /api/onedrive/folders/search - Search for folders
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OneDriveProvider } from "@/lib/cloud-storage/providers/onedrive";
import {
  hasOnedriveConnection,
  getOnedriveConnection,
  isTokenExpired,
  updateOnedriveTokens,
} from "@/db/queries/onedrive-queries";

/**
 * Get a valid access token for a user, refreshing if needed
 */
async function getAccessTokenForUser(userId: string): Promise<string> {
  const connection = await getOnedriveConnection(userId);

  if (!connection) {
    throw new Error("No OneDrive connection");
  }

  if (!connection.isActive) {
    throw new Error("OneDrive connection is inactive");
  }

  // Check if token needs refresh
  if (isTokenExpired(connection)) {
    if (!connection.refreshToken) {
      throw new Error("OneDrive connection invalid - no refresh token");
    }

    try {
      const provider = new OneDriveProvider();
      const newTokens = await provider.refreshToken(connection.refreshToken);
      newTokens.accountId = connection.microsoftAccountId;
      await updateOnedriveTokens(userId, newTokens);
      return newTokens.accessToken;
    } catch (error) {
      throw new Error("OneDrive connection invalid - token refresh failed");
    }
  }

  return connection.accessToken;
}

/**
 * GET /api/onedrive/folders/search
 * Search for folders by name
 * Query params:
 *   - q: Search query (required)
 *   - limit: Max results (default: 20)
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

    // Check if user has OneDrive connected
    const hasConnection = await hasOnedriveConnection(userId);
    if (!hasConnection) {
      return NextResponse.json(
        { error: "OneDrive not connected" },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Get access token
    const accessToken = await getAccessTokenForUser(userId);

    // Search folders using provider
    const provider = new OneDriveProvider();
    const folders = await provider.searchFolders(accessToken, query, limit);

    return NextResponse.json({ folders });
  } catch (error: any) {
    console.error("Error searching OneDrive folders:", error);

    if (error.message === "No OneDrive connection") {
      return NextResponse.json(
        { error: "OneDrive not connected" },
        { status: 403 }
      );
    }

    if (error.code === "TOKEN_EXPIRED" || error.message?.includes("token")) {
      return NextResponse.json(
        { error: "OneDrive connection expired. Please reconnect." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to search folders" },
      { status: 500 }
    );
  }
}
