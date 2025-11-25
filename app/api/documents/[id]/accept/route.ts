/**
 * Accept Classification API
 * POST /api/documents/:id/accept - Accept AI classification
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { acceptClassification } from "@/lib/ai/review";

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

    const result = await acceptClassification(params.id, userId);

    return NextResponse.json({
      success: result,
      message: "Classification accepted",
    });
  } catch (error: any) {
    console.error("Error accepting classification:", error);

    if (error.message === "Document not found") {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to accept classification" },
      { status: 500 }
    );
  }
}
