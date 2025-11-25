/**
 * Classification History API
 * GET /api/documents/:id/classification-history - Get classification history
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getClassificationHistory } from "@/lib/ai/review";

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

    const history = await getClassificationHistory(params.id);

    return NextResponse.json({
      documentId: params.id,
      history,
    });
  } catch (error: any) {
    console.error("Error fetching classification history:", error);

    if (error.message === "Document not found") {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get classification history" },
      { status: 500 }
    );
  }
}
