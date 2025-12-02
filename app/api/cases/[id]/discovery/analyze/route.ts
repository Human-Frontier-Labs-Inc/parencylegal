import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { discoveryRequestsTable, documentsTable, casesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  matchDocumentsToRequests,
  calculateComplianceStats,
} from "@/lib/services/document-matcher";

interface ParsedRequest {
  type: "RFP" | "Interrogatory";
  number: number;
  text: string;
  suggestedCategory: string | null;
  confidence: number;
}

/**
 * POST /api/cases/[id]/discovery/analyze
 * Save parsed requests and run compliance analysis
 */
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

    // Verify case belongs to user
    const [caseData] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const body = await request.json();
    const { requests: parsedRequests, clearExisting = false } = body;

    if (!parsedRequests || !Array.isArray(parsedRequests)) {
      return NextResponse.json(
        { error: "No requests provided" },
        { status: 400 }
      );
    }

    // Optionally clear existing requests
    if (clearExisting) {
      await db
        .delete(discoveryRequestsTable)
        .where(
          and(
            eq(discoveryRequestsTable.caseId, caseId),
            eq(discoveryRequestsTable.userId, userId)
          )
        );
    }

    // Insert new requests
    const insertedRequests = [];
    for (const req of parsedRequests as ParsedRequest[]) {
      const [inserted] = await db
        .insert(discoveryRequestsTable)
        .values({
          caseId,
          userId,
          type: req.type,
          number: req.number,
          text: req.text,
          categoryHint: req.suggestedCategory,
          status: "incomplete",
          completionPercentage: 0,
        })
        .returning();

      insertedRequests.push(inserted);
    }

    // Fetch all documents for this case
    const caseDocuments = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.caseId, caseId));

    // Run matching analysis
    const matchResults = matchDocumentsToRequests(
      insertedRequests.map((r) => ({
        id: r.id,
        type: r.type as "RFP" | "Interrogatory",
        number: r.number,
        text: r.text,
        categoryHint: r.categoryHint,
      })),
      caseDocuments.map((d) => ({
        id: d.id,
        fileName: d.fileName,
        category: d.category,
        subtype: d.subtype,
        confidence: d.confidence,
        metadata: d.metadata as any,
      }))
    );

    // Update requests with matching status
    for (const result of matchResults) {
      if (result.request.id) {
        await db
          .update(discoveryRequestsTable)
          .set({
            status: result.status,
            completionPercentage: result.completionPercentage,
          })
          .where(eq(discoveryRequestsTable.id, result.request.id));
      }
    }

    // Calculate compliance stats
    const stats = calculateComplianceStats(matchResults, caseDocuments.length);

    return NextResponse.json({
      success: true,
      requestsAdded: insertedRequests.length,
      stats,
      results: matchResults.map((r) => ({
        id: r.request.id,
        type: r.request.type,
        number: r.request.number,
        text: r.request.text,
        categoryHint: r.request.categoryHint,
        status: r.status,
        completionPercentage: r.completionPercentage,
        matchingDocuments: r.matchingDocuments,
      })),
    });
  } catch (error: any) {
    console.error("Error analyzing requests:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze requests" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cases/[id]/discovery/analyze
 * Re-run analysis on existing requests
 */
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

    // Verify case belongs to user
    const [caseData] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Fetch existing requests
    const existingRequests = await db
      .select()
      .from(discoveryRequestsTable)
      .where(
        and(
          eq(discoveryRequestsTable.caseId, caseId),
          eq(discoveryRequestsTable.userId, userId)
        )
      );

    // Fetch all documents for this case
    const caseDocuments = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.caseId, caseId));

    if (existingRequests.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          totalRequests: 0,
          completeRequests: 0,
          partialRequests: 0,
          incompleteRequests: 0,
          overallComplianceScore: 0,
          documentsWithMatches: 0,
          unmatchedDocuments: caseDocuments.length,
          totalDocuments: caseDocuments.length,
        },
        results: [],
      });
    }

    // Run matching analysis
    const matchResults = matchDocumentsToRequests(
      existingRequests.map((r) => ({
        id: r.id,
        type: r.type as "RFP" | "Interrogatory",
        number: r.number,
        text: r.text,
        categoryHint: r.categoryHint,
      })),
      caseDocuments.map((d) => ({
        id: d.id,
        fileName: d.fileName,
        category: d.category,
        subtype: d.subtype,
        confidence: d.confidence,
        metadata: d.metadata as any,
      }))
    );

    // Update requests with fresh matching data
    for (const result of matchResults) {
      if (result.request.id) {
        await db
          .update(discoveryRequestsTable)
          .set({
            status: result.status,
            completionPercentage: result.completionPercentage,
          })
          .where(eq(discoveryRequestsTable.id, result.request.id));
      }
    }

    // Calculate compliance stats
    const stats = calculateComplianceStats(matchResults, caseDocuments.length);

    return NextResponse.json({
      success: true,
      stats,
      results: matchResults.map((r) => ({
        id: r.request.id,
        type: r.request.type,
        number: r.request.number,
        text: r.request.text,
        categoryHint: r.request.categoryHint,
        status: r.status,
        completionPercentage: r.completionPercentage,
        matchingDocuments: r.matchingDocuments,
      })),
    });
  } catch (error: any) {
    console.error("Error re-analyzing requests:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze requests" },
      { status: 500 }
    );
  }
}
