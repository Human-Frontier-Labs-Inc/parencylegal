/**
 * Advanced Search API
 * Phase 9: Timeline, Search & Export
 *
 * POST /api/cases/:id/search/advanced - Hybrid full-text + semantic search
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable, documentsTable, documentChunksTable } from "@/db/schema";
import { eq, and, inArray, sql, ilike, or } from "drizzle-orm";
import { semanticSearch } from "@/lib/ai/embeddings";
import {
  buildTsQuery,
  extractSnippet,
  highlightMatches,
  calculateRelevanceScore,
  combineSearchResults,
  SearchResult,
} from "@/lib/search/search-utils";

interface SearchFilters {
  categories?: string[];
  documentTypes?: string[];
  dateRange?: { start: string; end: string };
  confidence?: { min: number; max: number };
}

interface SearchOptions {
  mode: "full-text" | "semantic" | "hybrid";
  limit?: number;
  offset?: number;
  minSimilarity?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: caseId } = await params;
    const body = await request.json();

    const { query, filters, options } = body as {
      query: string;
      filters?: SearchFilters;
      options?: SearchOptions;
    };

    // Validate query
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Verify case belongs to user
    const [caseData] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const searchMode = options?.mode || "hybrid";
    const limit = Math.min(options?.limit || 20, 50);
    const minSimilarity = options?.minSimilarity || 0.7;

    let fullTextResults: SearchResult[] = [];
    let semanticResults: SearchResult[] = [];
    let fullTextMs = 0;
    let semanticMs = 0;
    let tokensUsed = 0;

    // Build base document filter conditions
    const baseConditions = [
      eq(documentsTable.caseId, caseId),
      eq(documentsTable.userId, userId),
    ];

    if (filters?.categories && filters.categories.length > 0) {
      baseConditions.push(inArray(documentsTable.category, filters.categories));
    }

    if (filters?.documentTypes && filters.documentTypes.length > 0) {
      baseConditions.push(inArray(documentsTable.subtype, filters.documentTypes));
    }

    if (filters?.confidence) {
      if (filters.confidence.min !== undefined) {
        baseConditions.push(sql`${documentsTable.confidence} >= ${filters.confidence.min}`);
      }
      if (filters.confidence.max !== undefined) {
        baseConditions.push(sql`${documentsTable.confidence} <= ${filters.confidence.max}`);
      }
    }

    // Full-text search
    if (searchMode === "full-text" || searchMode === "hybrid") {
      const ftStart = Date.now();

      // Search in document file names and chunk content
      const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

      if (terms.length > 0) {
        // Search documents by filename
        const fileNameConditions = terms.map((term) =>
          ilike(documentsTable.fileName, `%${term}%`)
        );

        const matchingDocs = await db
          .select({
            id: documentsTable.id,
            fileName: documentsTable.fileName,
            category: documentsTable.category,
            subtype: documentsTable.subtype,
            metadata: documentsTable.metadata,
          })
          .from(documentsTable)
          .where(and(...baseConditions, or(...fileNameConditions)))
          .limit(limit);

        // Search chunks for content matches
        const chunkResults = await db.execute(sql`
          SELECT
            dc.id,
            dc.document_id as "documentId",
            dc.content,
            d.file_name as "fileName",
            d.category,
            d.subtype,
            d.metadata
          FROM document_chunks dc
          JOIN documents d ON dc.document_id = d.id
          WHERE dc.case_id = ${caseId}
            AND dc.user_id = ${userId}
            AND (
              ${sql.raw(terms.map((t) => `dc.content ILIKE '%${t.replace(/'/g, "''")}%'`).join(" OR "))}
            )
          LIMIT ${limit}
        `);

        const chunkRows = Array.isArray(chunkResults) ? chunkResults : (chunkResults as any).rows || [];

        // Combine document and chunk results
        const docMap = new Map<string, SearchResult>();

        // Add document matches
        for (const doc of matchingDocs) {
          const snippet = extractSnippet(doc.fileName, query, 50);
          const score = calculateRelevanceScore(doc.fileName, query, 0.5);

          docMap.set(doc.id, {
            id: doc.id,
            documentId: doc.id,
            fileName: doc.fileName,
            category: doc.category,
            subtype: doc.subtype,
            relevanceScore: score,
            matchType: "full-text",
            snippet: snippet || doc.fileName,
            highlights: highlightMatches(doc.fileName, query)
              .match(/<mark>([^<]+)<\/mark>/g)
              ?.map((m) => m.replace(/<\/?mark>/g, "")) || [],
            metadata: doc.metadata,
          });
        }

        // Add/merge chunk matches
        for (const chunk of chunkRows as any[]) {
          const snippet = extractSnippet(chunk.content, query, 100);
          const score = calculateRelevanceScore(chunk.content, query, 0.6);

          const existing = docMap.get(chunk.documentId);
          if (!existing || score > existing.relevanceScore) {
            docMap.set(chunk.documentId, {
              id: chunk.id,
              documentId: chunk.documentId,
              fileName: chunk.fileName,
              category: chunk.category,
              subtype: chunk.subtype,
              relevanceScore: score,
              matchType: "full-text",
              snippet: snippet || chunk.content.substring(0, 150),
              highlights: highlightMatches(snippet || chunk.content.substring(0, 150), query)
                .match(/<mark>([^<]+)<\/mark>/g)
                ?.map((m) => m.replace(/<\/?mark>/g, "")) || [],
              metadata: chunk.metadata,
            });
          }
        }

        fullTextResults = Array.from(docMap.values());
      }

      fullTextMs = Date.now() - ftStart;
    }

    // Semantic search
    if (searchMode === "semantic" || searchMode === "hybrid") {
      const semStart = Date.now();

      const semanticResult = await semanticSearch(
        caseId,
        query.trim(),
        limit,
        minSimilarity
      );

      tokensUsed = semanticResult.tokensUsed;

      // Get document info for chunks
      const chunkDocIds = [...new Set(semanticResult.chunks.map((c) => c.documentId))];

      let docInfo: Record<string, { fileName: string; category: string | null; subtype: string | null; metadata: any }> = {};

      if (chunkDocIds.length > 0) {
        const docs = await db
          .select({
            id: documentsTable.id,
            fileName: documentsTable.fileName,
            category: documentsTable.category,
            subtype: documentsTable.subtype,
            metadata: documentsTable.metadata,
          })
          .from(documentsTable)
          .where(inArray(documentsTable.id, chunkDocIds));

        docInfo = docs.reduce((acc, doc) => {
          acc[doc.id] = doc;
          return acc;
        }, {} as typeof docInfo);
      }

      // Convert to search results
      semanticResults = semanticResult.chunks.map((chunk) => {
        const doc = docInfo[chunk.documentId];
        return {
          id: chunk.id,
          documentId: chunk.documentId,
          fileName: doc?.fileName || "Unknown",
          category: doc?.category || null,
          subtype: doc?.subtype || null,
          relevanceScore: chunk.similarity,
          matchType: "semantic" as const,
          snippet: chunk.content.substring(0, 200),
          highlights: [],
          metadata: doc?.metadata || null,
        };
      });

      // Apply category/type filters to semantic results
      if (filters?.categories && filters.categories.length > 0) {
        semanticResults = semanticResults.filter((r) =>
          r.category && filters.categories!.includes(r.category)
        );
      }

      if (filters?.documentTypes && filters.documentTypes.length > 0) {
        semanticResults = semanticResults.filter((r) =>
          r.subtype && filters.documentTypes!.includes(r.subtype)
        );
      }

      semanticMs = Date.now() - semStart;
    }

    // Combine results for hybrid mode
    let finalResults: SearchResult[];

    if (searchMode === "hybrid") {
      finalResults = combineSearchResults(fullTextResults, semanticResults);
    } else if (searchMode === "full-text") {
      finalResults = fullTextResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    } else {
      finalResults = semanticResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // Apply limit
    finalResults = finalResults.slice(0, limit);

    const totalMs = Date.now() - startTime;

    return NextResponse.json({
      query: query.trim(),
      results: finalResults,
      totalResults: finalResults.length,
      searchMode,
      tokensUsed,
      timing: {
        fullTextMs: searchMode !== "semantic" ? fullTextMs : undefined,
        semanticMs: searchMode !== "full-text" ? semanticMs : undefined,
        totalMs,
      },
    });
  } catch (error: any) {
    console.error("[Advanced Search API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Search failed" },
      { status: 500 }
    );
  }
}
