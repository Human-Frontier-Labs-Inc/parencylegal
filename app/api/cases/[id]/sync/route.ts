/**
 * Case Sync API
 * POST /api/cases/:id/sync - Sync documents from cloud storage (Dropbox or OneDrive)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable } from "@/db/schema/cases-schema";
import { eq, and } from "drizzle-orm";
import { syncDropboxFolder } from "@/lib/dropbox/sync";
import { syncOneDriveFolder } from "@/lib/onedrive/sync";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await params in Next.js 15
    const { id } = await params;

    // Verify case exists and belongs to user
    const [caseData] = await db
      .select()
      .from(casesTable)
      .where(
        and(eq(casesTable.id, id), eq(casesTable.userId, userId))
      );

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Check for cloud storage connection (new fields first, then legacy)
    const provider = caseData.cloudStorageProvider;
    const folderPath = caseData.cloudFolderPath || caseData.dropboxFolderPath;

    if (!folderPath) {
      return NextResponse.json(
        { error: "No cloud storage folder connected to this case" },
        { status: 400 }
      );
    }

    // Sync based on provider
    let result;
    if (provider === 'onedrive') {
      result = await syncOneDriveFolder(id, userId);
    } else {
      // Default to Dropbox sync (for legacy cases without cloudStorageProvider set)
      result = await syncDropboxFolder(id, userId);
    }

    // Note: lastSyncedAt is already updated in syncDropboxFolder

    return NextResponse.json({
      success: true,
      provider: provider || 'dropbox',
      synced: result.filesNew,
      skipped: result.filesSkipped,
      updated: result.filesUpdated,
      found: result.filesFound,
      errors: result.errors,
      durationMs: result.durationMs,
    });
  } catch (error: any) {
    console.error("Error syncing case:", error);
    return NextResponse.json(
      {
        error: "Failed to sync documents",
        message: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
