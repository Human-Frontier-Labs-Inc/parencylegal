/**
 * Document Classification API
 * POST /api/documents/:id/classify - Classify a document using AI
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { classifyAndStore } from "@/lib/ai/classification";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: documentId } = await params;

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "AI classification not configured" },
        { status: 503 }
      );
    }

    // Classify the document
    const result = await classifyAndStore(documentId, userId);

    return NextResponse.json({
      success: true,
      classification: {
        category: result.category,
        subtype: result.subtype,
        confidence: result.confidence,
        needsReview: result.needsReview,
        metadata: result.metadata,
      },
      processingTimeMs: result.processingTimeMs,
    });
  } catch (error: any) {
    console.error("Classification error:", error);
    console.error("Error stack:", error.stack);

    if (error.message === "Document not found") {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Return more detailed error for debugging
    return NextResponse.json(
      {
        error: error.message || "Classification failed",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
