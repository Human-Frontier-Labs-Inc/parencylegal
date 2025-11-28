/**
 * Discovery Request Detail API
 * Phase 8: Discovery Request Tracking
 *
 * GET    /api/cases/:id/discovery/:requestId - Get a specific discovery request
 * PUT    /api/cases/:id/discovery/:requestId - Update a discovery request
 * DELETE /api/cases/:id/discovery/:requestId - Delete a discovery request
 */

import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  getDiscoveryRequest,
  updateDiscoveryRequest,
  deleteDiscoveryRequest,
  getMappingsForRequest,
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

    const discoveryRequest = await getDiscoveryRequest(requestId, userId);

    if (!discoveryRequest) {
      return new Response(JSON.stringify({ error: "Discovery request not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if mappings are requested
    const url = new URL(request.url);
    const includeMappings = url.searchParams.get("mappings") === "true";

    if (includeMappings) {
      const mappings = await getMappingsForRequest(requestId, userId);
      return new Response(
        JSON.stringify({
          request: discoveryRequest,
          mappings,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(discoveryRequest), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Discovery API] GET detail error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to get discovery request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(
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

    const body = await request.json();

    // Validate status if provided
    if (body.status && !["incomplete", "complete", "partial"].includes(body.status)) {
      return new Response(
        JSON.stringify({
          error: "Invalid status. Must be 'incomplete', 'complete', or 'partial'",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate completion percentage if provided
    if (
      body.completionPercentage !== undefined &&
      (typeof body.completionPercentage !== "number" ||
        body.completionPercentage < 0 ||
        body.completionPercentage > 100)
    ) {
      return new Response(
        JSON.stringify({
          error: "Completion percentage must be a number between 0 and 100",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const updated = await updateDiscoveryRequest(
      requestId,
      {
        text: body.text,
        categoryHint: body.categoryHint,
        notes: body.notes,
        status: body.status,
        completionPercentage: body.completionPercentage,
      },
      userId
    );

    return new Response(JSON.stringify(updated), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Discovery API] PUT error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to update discovery request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
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

    const deleted = await deleteDiscoveryRequest(requestId, userId);

    if (!deleted) {
      return new Response(JSON.stringify({ error: "Discovery request not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Discovery API] DELETE error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to delete discovery request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
