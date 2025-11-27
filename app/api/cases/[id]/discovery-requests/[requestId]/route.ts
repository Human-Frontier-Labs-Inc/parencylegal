/**
 * Individual Discovery Request API
 * PUT/DELETE for managing specific RFP items
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable, discoveryRequestsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: caseId, requestId } = await params;
    const body = await request.json();

    // Verify case belongs to user
    const [caseData] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Update the request
    const { text, categoryHint, notes, status, completionPercentage } = body;

    const [updated] = await db
      .update(discoveryRequestsTable)
      .set({
        ...(text !== undefined && { text }),
        ...(categoryHint !== undefined && { categoryHint }),
        ...(notes !== undefined && { notes }),
        ...(status !== undefined && { status }),
        ...(completionPercentage !== undefined && { completionPercentage }),
      })
      .where(
        and(
          eq(discoveryRequestsTable.id, requestId),
          eq(discoveryRequestsTable.caseId, caseId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating discovery request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: caseId, requestId } = await params;

    // Verify case belongs to user
    const [caseData] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Delete the request
    const [deleted] = await db
      .delete(discoveryRequestsTable)
      .where(
        and(
          eq(discoveryRequestsTable.id, requestId),
          eq(discoveryRequestsTable.caseId, caseId)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting discovery request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
