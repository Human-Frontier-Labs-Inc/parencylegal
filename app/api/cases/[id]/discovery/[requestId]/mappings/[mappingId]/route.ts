/**
 * Document Mapping Detail API
 * Phase 8: Discovery Request Tracking
 *
 * PUT    /api/cases/:id/discovery/:requestId/mappings/:mappingId - Update mapping status
 * DELETE /api/cases/:id/discovery/:requestId/mappings/:mappingId - Delete a mapping
 */

import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  updateMappingStatus,
  deleteMapping,
  getDiscoveryRequest,
} from "@/lib/discovery";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string; mappingId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: caseId, requestId, mappingId } = await params;

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

    const body = await request.json();

    if (!body.status || !["accepted", "rejected"].includes(body.status)) {
      return new Response(
        JSON.stringify({ error: "Invalid status. Must be 'accepted' or 'rejected'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const updated = await updateMappingStatus(mappingId, body.status, userId);

    return new Response(JSON.stringify(updated), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Discovery API] Mapping PUT error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to update mapping" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string; mappingId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: caseId, requestId, mappingId } = await params;

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

    const deleted = await deleteMapping(mappingId, userId);

    if (!deleted) {
      return new Response(JSON.stringify({ error: "Mapping not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Discovery API] Mapping DELETE error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to delete mapping" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
