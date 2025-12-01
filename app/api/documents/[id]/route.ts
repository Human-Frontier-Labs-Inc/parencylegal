/**
 * Single Document API
 * GET /api/documents/:id - Get document details
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { documentsTable } from "@/db/schema/documents-schema";
import { casesTable } from "@/db/schema/cases-schema";
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

    // Get document with case verification
    const [document] = await db
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
        reviewedBy: documentsTable.reviewedBy,
        dropboxPath: documentsTable.dropboxPath,
        storageUrl: documentsTable.storageUrl,
        storagePath: documentsTable.storagePath,
        documentDate: documentsTable.documentDate,
        metadata: documentsTable.metadata,
        caseId: documentsTable.caseId,
        createdAt: documentsTable.createdAt,
        updatedAt: documentsTable.updatedAt,
      })
      .from(documentsTable)
      .innerJoin(casesTable, eq(documentsTable.caseId, casesTable.id))
      .where(
        and(
          eq(documentsTable.id, id),
          eq(casesTable.userId, userId)
        )
      );

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
