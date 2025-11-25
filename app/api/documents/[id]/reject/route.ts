/**
 * Reject Classification API
 * POST /api/documents/:id/reject - Reject AI classification
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rejectClassification } from "@/lib/ai/review";

export async function POST(
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
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Reason is required" },
        { status: 400 }
      );
    }

    const result = await rejectClassification(params.id, userId, reason);

    return NextResponse.json({
      success: result,
      message: "Classification rejected",
    });
  } catch (error: any) {
    console.error("Error rejecting classification:", error);

    if (error.message === "Document not found") {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (error.message === "Reason is required") {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to reject classification" },
      { status: 500 }
    );
  }
}
