/**
 * Case Sync API
 * POST /api/cases/:id/sync - Sync documents from Dropbox
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable } from "@/db/schema/cases-schema";
import { eq, and } from "drizzle-orm";
import { syncDropboxFolder } from "@/lib/dropbox/sync";

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

    if (!caseData.dropboxFolderPath) {
      return NextResponse.json(
        { error: "No Dropbox folder connected to this case" },
        { status: 400 }
      );
    }

    // Sync documents from Dropbox
    const result = await syncDropboxFolder(id, userId);

    // Note: lastSyncedAt is already updated in syncDropboxFolder

    return NextResponse.json({
      success: true,
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
