/**
 * Export Download API
 * Phase 9: Timeline, Search & Export
 *
 * GET /api/cases/:id/export/:jobId/download - Download completed export
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

    // Check if job is completed
    if (job.status !== "completed") {
      return NextResponse.json(
        { error: "Export is not ready for download", status: job.status },
        { status: 400 }
      );
    }

    // Check if expired
    if (job.expiresAt && new Date(job.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Export has expired" },
        { status: 410 }
      );
    }

    // Get signed download URL
    const download = await getExportDownloadUrl(jobId, userId);

    if (!download) {
      return NextResponse.json(
        { error: "Download not available" },
        { status: 404 }
      );
    }

    // Redirect to signed URL
    return NextResponse.redirect(download.url);
  } catch (error: any) {
    console.error("[Export Download API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get download" },
      { status: 500 }
    );
  }
}
