/**
 * Bulk Import Discovery Requests API
 * Phase 8: Discovery Request Tracking
 *
 * POST /api/cases/:id/discovery/import - Bulk import discovery requests from text
 */

import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { bulkImportDiscoveryRequests, validateImportText } from "@/lib/discovery";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: caseId } = await params;

    // Verify case belongs to user
    const [caseData] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

    if (!caseData) {
      return new Response(JSON.stringify({ error: "Case not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();

    if (!body.text || typeof body.text !== "string") {
      return new Response(
        JSON.stringify({ error: "Text content is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if this is a validation-only request
    const url = new URL(request.url);
    const validateOnly = url.searchParams.get("validate") === "true";

    if (validateOnly) {
      const validation = validateImportText(body.text);
      return new Response(JSON.stringify(validation), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Perform the import
    const result = await bulkImportDiscoveryRequests(caseId, body.text, userId);

    return new Response(JSON.stringify(result), {
      status: result.imported > 0 ? 201 : 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Discovery API] Import error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to import discovery requests" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
