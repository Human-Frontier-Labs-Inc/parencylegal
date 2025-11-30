/**
 * Export Jobs List API
 * Phase 9: Timeline, Search & Export
 *
 * GET /api/cases/:id/export - List all export jobs for a case
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { listExportJobs } from "@/lib/export/export-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: caseId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Verify case belongs to user
    const [caseData] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Get status filter
    const status = searchParams.get("status") as any;

    // List jobs
    const jobs = await listExportJobs(caseId, userId, status);

    return NextResponse.json({
      caseId,
      jobs: jobs.map((job) => ({
        jobId: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        config: job.config,
        result: job.result,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        expiresAt: job.expiresAt,
      })),
    });
  } catch (error: any) {
    console.error("[Export List API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list export jobs" },
      { status: 500 }
    );
  }
}
