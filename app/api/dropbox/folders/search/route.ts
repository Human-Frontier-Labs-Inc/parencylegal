/**
 * Dropbox Folder Search API Route
 * GET /api/dropbox/folders/search - Search for folders
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { searchDropboxFolders } from "@/lib/dropbox/folders";
import { hasDropboxConnection } from "@/db/queries/dropbox-queries";

/**
 * GET /api/dropbox/folders/search
 * Search for folders by query
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

    // Check if user has Dropbox connected
    const hasConnection = await hasDropboxConnection(userId);
    if (!hasConnection) {
      return NextResponse.json(
        { error: "Dropbox not connected" },
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

    // Search folders
    const folders = await searchDropboxFolders(userId, query, limit);

    return NextResponse.json({ folders });
  } catch (error: any) {
    console.error("Error searching Dropbox folders:", error);

    return NextResponse.json(
      { error: "Failed to search folders" },
      { status: 500 }
    );
  }
}
