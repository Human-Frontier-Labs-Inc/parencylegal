/**
 * AI Document Suggestion API
 * Phase 8: Discovery Request Tracking
 *
 * GET  /api/cases/:id/discovery/:requestId/suggest - Get AI-suggested document mappings
 * POST /api/cases/:id/discovery/:requestId/suggest - Create AI suggestions
 */

import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  suggestDocumentsForRequest,
  createAISuggestions,
  getDiscoveryRequest,
} from "@/lib/discovery";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: caseId, requestId } = await params;

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

    // Verify request exists
    const discoveryRequest = await getDiscoveryRequest(requestId, userId);
    if (!discoveryRequest) {
      return new Response(JSON.stringify({ error: "Discovery request not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse options from query params
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const minConfidence = parseInt(url.searchParams.get("minConfidence") || "30", 10);

    const result = await suggestDocumentsForRequest(requestId, caseId, userId, {
      limit,
      minConfidence,
    });

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Discovery API] Suggest GET error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to get suggestions" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: caseId, requestId } = await params;

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

    // Verify request exists
    const discoveryRequest = await getDiscoveryRequest(requestId, userId);
    if (!discoveryRequest) {
      return new Response(JSON.stringify({ error: "Discovery request not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse options from body
    const body = await request.json().catch(() => ({}));
    const limit = body.limit || 10;

    // Create AI suggestions
    const created = await createAISuggestions(requestId, caseId, userId, limit);

    return new Response(
      JSON.stringify({
        success: true,
        suggestionsCreated: created,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Discovery API] Suggest POST error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to create suggestions" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
