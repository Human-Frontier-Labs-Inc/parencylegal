/**
 * Document Mappings API
 * Phase 8: Discovery Request Tracking
 *
 * GET  /api/cases/:id/discovery/:requestId/mappings - Get all mappings for a request
 * POST /api/cases/:id/discovery/:requestId/mappings - Create a new mapping
 */

import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable, documentsTable } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  getMappingsForRequest,
  createDocumentMapping,
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

    const mappings = await getMappingsForRequest(requestId, userId);

    // Optionally include document details
    const url = new URL(request.url);
    const includeDocuments = url.searchParams.get("includeDocuments") === "true";

    if (includeDocuments && mappings.length > 0) {
      const documentIds = mappings.map((m) => m.documentId);
      const documents = await db
        .select({
          id: documentsTable.id,
          fileName: documentsTable.fileName,
          category: documentsTable.category,
          subtype: documentsTable.subtype,
        })
        .from(documentsTable)
        .where(inArray(documentsTable.id, documentIds));

      const docMap = new Map(documents.map((d) => [d.id, d]));

      const mappingsWithDocs = mappings.map((m) => ({
        ...m,
        document: docMap.get(m.documentId) || null,
      }));

      return new Response(JSON.stringify({ mappings: mappingsWithDocs }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ mappings }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Discovery API] Mappings GET error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to get mappings" }),
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

    const body = await request.json();

    if (!body.documentId || typeof body.documentId !== "string") {
      return new Response(
        JSON.stringify({ error: "documentId is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify document exists and belongs to user
    const [document] = await db
      .select()
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.id, body.documentId),
          eq(documentsTable.userId, userId)
        )
      );

    if (!document) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const source = body.source === "ai_suggestion" ? "ai_suggestion" : "manual_addition";

    const mapping = await createDocumentMapping(
      body.documentId,
      requestId,
      userId,
      source,
      body.confidence,
      body.reasoning
    );

    return new Response(JSON.stringify(mapping), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Discovery API] Mappings POST error:", error);

    if (error.message?.includes("already mapped")) {
      return new Response(
        JSON.stringify({ error: "Document is already mapped to this request" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || "Failed to create mapping" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
