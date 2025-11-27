/**
 * Semantic Search API
 * Phase 5: Document Intelligence (RAG)
 *
 * POST /api/cases/:id/search - Search documents using semantic similarity
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable, documentsTable } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { semanticSearch } from "@/lib/ai/embeddings";

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
    const { query, limit = 5, minSimilarity = 0.7 } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Verify case belongs to user
    const [caseData] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Perform semantic search
    const searchResult = await semanticSearch(
      caseId,
      query.trim(),
      Math.min(limit, 20), // Cap at 20 results
      Math.max(0.5, Math.min(minSimilarity, 0.95)) // Clamp similarity
    );

    // Get document details for the chunks
    const documentIds = [...new Set(searchResult.chunks.map(c => c.documentId))];

    let documentMap: Record<string, { fileName: string; category: string | null }> = {};

    if (documentIds.length > 0) {
      const documents = await db
        .select({
          id: documentsTable.id,
          fileName: documentsTable.fileName,
          category: documentsTable.category,
        })
        .from(documentsTable)
        .where(inArray(documentsTable.id, documentIds));

      documentMap = documents.reduce((acc, doc) => {
        acc[doc.id] = { fileName: doc.fileName, category: doc.category };
        return acc;
      }, {} as typeof documentMap);
    }

    // Enrich chunks with document info
    const enrichedChunks = searchResult.chunks.map(chunk => ({
      ...chunk,
      document: documentMap[chunk.documentId] || null,
    }));

    return NextResponse.json({
      query: searchResult.query,
      results: enrichedChunks,
      totalResults: enrichedChunks.length,
      tokensUsed: searchResult.tokensUsed,
    });
  } catch (error: any) {
    console.error("Semantic search error:", error);

    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
