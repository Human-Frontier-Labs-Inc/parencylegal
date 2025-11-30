/**
 * Export Job Status API
 * Phase 9: Timeline, Search & Export
 *
 * GET /api/cases/:id/export/:jobId - Get export job status
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getExportJobStatus, getExportDownloadUrl } from "@/lib/export/export-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: caseId, jobId } = await params;

    // Get job status
    const job = await getExportJobStatus(jobId, userId);

    if (!job) {
      return NextResponse.json({ error: "Export job not found" }, { status: 404 });
    }

    // Verify job belongs to the case
    if (job.caseId !== caseId) {
      return NextResponse.json({ error: "Export job not found" }, { status: 404 });
    }

    // Include download URL if completed
    let downloadUrl: string | null = null;
    if (job.status === "completed") {
      const download = await getExportDownloadUrl(jobId, userId);
      if (download) {
        downloadUrl = download.url;
      }
    }

    return NextResponse.json({
      jobId: job.id,
      caseId: job.caseId,
      type: job.type,
      status: job.status,
      progress: job.progress,
      config: job.config,
      result: job.result,
      downloadUrl,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      expiresAt: job.expiresAt,
      errorMessage: job.errorMessage,
    });
  } catch (error: any) {
    console.error("[Export Job Status API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get export status" },
      { status: 500 }
    );
  }
}
