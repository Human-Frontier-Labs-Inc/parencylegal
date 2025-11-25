/**
 * Dropbox Folders API Route
 * GET /api/dropbox/folders - List folders and files
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listDropboxFolders } from "@/lib/dropbox/folders";
import { hasDropboxConnection } from "@/db/queries/dropbox-queries";

/**
 * GET /api/dropbox/folders
 * List folders and files at a specific path
 * Query params:
 *   - path: Folder path (default: root)
 *   - cursor: Pagination cursor for more results
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
    const path = searchParams.get("path") || "";
    const cursor = searchParams.get("cursor") || undefined;

    // List folders
    const contents = await listDropboxFolders(userId, path, cursor);

    return NextResponse.json(contents);
  } catch (error: any) {
    console.error("Error listing Dropbox folders:", error);

    if (error.message === "No Dropbox connection") {
      return NextResponse.json(
        { error: "Dropbox not connected" },
        { status: 403 }
      );
    }

    if (error.message === "Folder not found") {
      return NextResponse.json(
        { error: "Folder not found" },
        { status: 404 }
      );
    }

    if (error.message === "Dropbox connection invalid") {
      return NextResponse.json(
        { error: "Dropbox connection expired. Please reconnect." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to list folders" },
      { status: 500 }
    );
  }
}
