/**
 * Document Classification Management API
 * GET /api/documents/:id/classification - Get classification
 * PUT /api/documents/:id/classification - Override classification
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { documentsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { overrideClassification } from "@/lib/ai/review";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const [document] = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.id, params.id))
      .limit(1);

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (document.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      documentId: document.id,
      category: document.category,
      subtype: document.subtype,
      confidence: (document.confidence || 0) / 100,
      needsReview: document.needsReview,
      reviewedAt: document.reviewedAt,
      reviewedBy: document.reviewedBy,
      metadata: document.metadata,
    });
  } catch (error: any) {
    console.error("Error fetching classification:", error);
    return NextResponse.json(
      { error: "Failed to get classification" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { category, subtype } = body;

    if (!category || !subtype) {
      return NextResponse.json(
        { error: "Category and subtype are required" },
        { status: 400 }
      );
    }

    const result = await overrideClassification(params.id, userId, {
      category,
      subtype,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Error overriding classification:", error);

    if (error.message === "Document not found") {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (error.message === "Invalid category/subtype combination") {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to override classification" },
      { status: 500 }
    );
  }
}
