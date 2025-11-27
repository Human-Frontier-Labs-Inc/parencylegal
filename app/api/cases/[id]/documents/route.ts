/**
 * Case Documents API
 * GET /api/cases/:id/documents - Get all documents for a case
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable } from "@/db/schema/cases-schema";
import { documentsTable } from "@/db/schema/documents-schema";
import { eq, and } from "drizzle-orm";

export async function GET(
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

    // Get documents for this case
    const documents = await db
      .select({
        id: documentsTable.id,
        fileName: documentsTable.fileName,
        fileType: documentsTable.fileType,
        fileSize: documentsTable.fileSize,
        category: documentsTable.category,
        subtype: documentsTable.subtype,
        confidence: documentsTable.confidence,
        needsReview: documentsTable.needsReview,
        reviewedAt: documentsTable.reviewedAt,
        dropboxPath: documentsTable.dropboxPath,
        metadata: documentsTable.metadata,
        createdAt: documentsTable.createdAt,
      })
      .from(documentsTable)
      .where(eq(documentsTable.caseId, id));

    return NextResponse.json({
      documents,
      total: documents.length,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
