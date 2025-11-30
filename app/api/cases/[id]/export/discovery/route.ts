/**
 * Discovery Export API
 * Phase 9: Timeline, Search & Export
 *
 * POST /api/cases/:id/export/discovery - Create export job by discovery request
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createDiscoveryExportJob } from "@/lib/export/export-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: caseId } = await params;
    const body = await request.json();

    const { requestIds, options } = body as {
      requestIds: string[];
      options?: any;
    };

    // Validate request IDs
    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json(
        { error: "At least one request ID is required" },
        { status: 400 }
      );
    }

    // Verify case belongs to user
    const [caseData] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Create export job
    const job = await createDiscoveryExportJob(caseId, userId, {
      requestIds,
      options,
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      type: job.type,
      createdAt: job.createdAt,
    });
  } catch (error: any) {
    console.error("[Export Discovery API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create export job" },
      { status: 500 }
    );
  }
}
