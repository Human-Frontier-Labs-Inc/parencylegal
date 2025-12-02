/**
 * Discovery Requests API
 * Phase 8: Discovery Request Tracking
 *
 * GET  /api/cases/:id/discovery - List all discovery requests for a case
 * POST /api/cases/:id/discovery - Create a new discovery request
 */

import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  getDiscoveryRequests,
  createDiscoveryRequest,
  getDiscoveryStats,
} from "@/lib/discovery";

export async function GET(
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

    // Check if stats are requested
    const url = new URL(request.url);
    const includeStats = url.searchParams.get("stats") === "true";

    const requests = await getDiscoveryRequests(caseId, userId);

    if (includeStats) {
      const stats = await getDiscoveryStats(caseId, userId);
      return new Response(
        JSON.stringify({
          requests,
          stats,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ requests }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Discovery API] GET error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to get discovery requests" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(
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

    // Delete all discovery requests for this case
    const { deleteAllDiscoveryRequestsForCase } = await import("@/lib/discovery");
    const deletedCount = await deleteAllDiscoveryRequestsForCase(caseId, userId);

    return new Response(
      JSON.stringify({ success: true, deleted: deletedCount }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Discovery API] DELETE error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to delete discovery requests" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

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

    // Validate required fields
    if (!body.type || !["RFP", "Interrogatory"].includes(body.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid type. Must be 'RFP' or 'Interrogatory'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (typeof body.number !== "number" || body.number < 1) {
      return new Response(
        JSON.stringify({ error: "Invalid number. Must be a positive integer" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!body.text || typeof body.text !== "string" || body.text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const created = await createDiscoveryRequest(
      {
        caseId,
        type: body.type,
        number: body.number,
        text: body.text.trim(),
        categoryHint: body.categoryHint,
        notes: body.notes,
      },
      userId
    );

    return new Response(JSON.stringify(created), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Discovery API] POST error:", error);

    // Handle duplicate key error
    if (error.message?.includes("duplicate") || error.code === "23505") {
      return new Response(
        JSON.stringify({
          error: "A request with this type and number already exists",
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || "Failed to create discovery request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
