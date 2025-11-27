/**
 * Discovery Requests API
 * Manage RFP (Request for Production) items for a case
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable, discoveryRequestsTable, documentsTable } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: caseId } = await params;

    // Verify case belongs to user
    const [caseData] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Get all discovery requests for this case
    const requests = await db
      .select()
      .from(discoveryRequestsTable)
      .where(eq(discoveryRequestsTable.caseId, caseId))
      .orderBy(discoveryRequestsTable.number);

    // Get documents to calculate matches
    const documents = await db
      .select({
        id: documentsTable.id,
        category: documentsTable.category,
        subtype: documentsTable.subtype,
        metadata: documentsTable.metadata,
      })
      .from(documentsTable)
      .where(eq(documentsTable.caseId, caseId));

    // Enrich requests with matching document counts
    const enrichedRequests = requests.map(req => {
      // Simple matching: count documents that match the category hint
      const matchingDocs = documents.filter(doc => {
        if (!doc.category) return false;

        // Match by category hint if available
        if (req.categoryHint) {
          return doc.category.toLowerCase().includes(req.categoryHint.toLowerCase()) ||
                 (doc.subtype && doc.subtype.toLowerCase().includes(req.categoryHint.toLowerCase()));
        }

        // Try to match by request text keywords
        const keywords = req.text.toLowerCase().split(/\s+/);
        const docCategory = doc.category.toLowerCase();
        const docSubtype = (doc.subtype || '').toLowerCase();

        return keywords.some(keyword =>
          keyword.length > 3 && (docCategory.includes(keyword) || docSubtype.includes(keyword))
        );
      });

      return {
        ...req,
        matchingDocumentCount: matchingDocs.length,
        matchingDocumentIds: matchingDocs.map(d => d.id),
      };
    });

    // Calculate overall stats
    const stats = {
      total: requests.length,
      complete: requests.filter(r => r.status === 'complete').length,
      partial: requests.filter(r => r.status === 'partial').length,
      incomplete: requests.filter(r => r.status === 'incomplete').length,
    };

    return NextResponse.json({
      requests: enrichedRequests,
      stats,
    });
  } catch (error) {
    console.error("Error fetching discovery requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: caseId } = await params;
    const body = await request.json();

    // Verify case belongs to user
    const [caseData] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const { type, number, text, categoryHint, notes } = body;

    if (!type || !number || !text) {
      return NextResponse.json(
        { error: "Missing required fields: type, number, text" },
        { status: 400 }
      );
    }

    // Create new discovery request
    const [newRequest] = await db
      .insert(discoveryRequestsTable)
      .values({
        caseId,
        userId,
        type,
        number,
        text,
        categoryHint,
        notes,
        status: 'incomplete',
        completionPercentage: 0,
      })
      .returning();

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error: any) {
    console.error("Error creating discovery request:", error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: "A request with this number already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
