/**
 * Timeline API
 * Phase 9: Timeline, Search & Export
 *
 * GET /api/cases/:id/timeline - Get chronological document timeline
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  getTimelineEvents,
  aggregateTimelineData,
  getAvailableCategories,
  getAvailableDocumentTypes,
  TimelineFilter,
} from "@/lib/timeline/timeline";

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

    // Check if this is a summary request
    const summary = searchParams.get("summary") === "true";

    if (summary) {
      const aggregated = await aggregateTimelineData(caseId, userId);

      return NextResponse.json({
        caseId,
        caseName: caseData.name,
        ...aggregated,
      });
    }

    // Parse filters from query params
    const filters: TimelineFilter = {};

    // Categories filter
    const categories = searchParams.get("categories");
    if (categories) {
      filters.categories = categories.split(",").map((c) => c.trim());
    }

    // Document types filter
    const documentTypes = searchParams.get("documentTypes");
    if (documentTypes) {
      filters.documentTypes = documentTypes.split(",").map((t) => t.trim());
    }

    // Date range filter
    const startDate = searchParams.get("startDate");
    if (startDate) {
      const parsed = new Date(startDate);
      if (!isNaN(parsed.getTime())) {
        filters.startDate = parsed;
      }
    }

    const endDate = searchParams.get("endDate");
    if (endDate) {
      const parsed = new Date(endDate);
      if (!isNaN(parsed.getTime())) {
        filters.endDate = parsed;
      }
    }

    // Get timeline events
    const result = await getTimelineEvents(caseId, userId, filters);

    // Get available filter options
    const [availableCategories, availableDocumentTypes] = await Promise.all([
      getAvailableCategories(caseId, userId),
      getAvailableDocumentTypes(caseId, userId),
    ]);

    return NextResponse.json({
      caseId,
      caseName: caseData.name,
      events: result.events,
      totalEvents: result.totalEvents,
      dateRange: result.dateRange,
      categoryCounts: result.categoryCounts,
      filters: {
        available: {
          categories: availableCategories,
          documentTypes: availableDocumentTypes,
        },
        applied: filters,
      },
    });
  } catch (error: any) {
    console.error("[Timeline API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get timeline" },
      { status: 500 }
    );
  }
}
