/**
 * Document Mapping for Discovery Requests
 * Phase 8: Discovery Request Tracking
 *
 * AI-powered document-to-request matching and manual mappings
 */

import { db } from "@/db/db";
import {
  documentRequestMappingsTable,
  documentsTable,
  discoveryRequestsTable,
} from "@/db/schema";
import { eq, and, desc, sql, inArray, notInArray } from "drizzle-orm";
import { detectCategoryFromText, extractKeywords } from "./category-detection";
import { parseDateRangeFromText, matchDocumentToDateRange } from "./date-parser";
import { semanticMatchDocuments, getDocumentMatchScore } from "./semantic-matching";
import { getDiscoveryRequest, updateDiscoveryRequest } from "./requests";

export interface SuggestedMapping {
  document: {
    id: string;
    fileName: string;
    category: string | null;
    subtype: string | null;
    metadata: Record<string, any> | null;
  };
  confidence: number;
  reasoning: string;
  matchFactors: {
    categoryMatch: boolean;
    keywordMatch: boolean;
    dateMatch: boolean;
    semanticScore: number;
  };
}

export interface MappingSuggestionResult {
  requestId: string;
  suggestions: SuggestedMapping[];
  totalDocumentsSearched: number;
}

export interface DocumentMapping {
  id: string;
  documentId: string;
  requestId: string;
  caseId: string;
  userId: string;
  source: "ai_suggestion" | "manual_addition";
  confidence: number | null;
  reasoning: string | null;
  status: "suggested" | "accepted" | "rejected";
  reviewedAt: Date | null;
  reviewedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Suggest documents for a discovery request using AI matching
 */
export async function suggestDocumentsForRequest(
  requestId: string,
  caseId: string,
  userId: string,
  options?: { limit?: number; minConfidence?: number }
): Promise<MappingSuggestionResult> {
  const limit = options?.limit ?? 10;
  const minConfidence = options?.minConfidence ?? 30;

  // Get the request details
  const request = await getDiscoveryRequest(requestId, userId);
  if (!request) {
    throw new Error("Discovery request not found");
  }

  // Get already-mapped document IDs
  const existingMappings = await db
    .select({ documentId: documentRequestMappingsTable.documentId })
    .from(documentRequestMappingsTable)
    .where(eq(documentRequestMappingsTable.requestId, requestId));

  const mappedDocIds = existingMappings.map((m) => m.documentId);

  // Get all documents for the case
  const allDocuments = await db
    .select()
    .from(documentsTable)
    .where(
      and(
        eq(documentsTable.caseId, caseId),
        eq(documentsTable.userId, userId),
        mappedDocIds.length > 0
          ? notInArray(documentsTable.id, mappedDocIds)
          : sql`TRUE`
      )
    );

  // Parse request for matching criteria
  const categoryHint = request.categoryHint || detectCategoryFromText(request.text);
  const keywords = extractKeywords(request.text);
  const dateRange = parseDateRangeFromText(request.text);

  // Get semantic matches
  const semanticResults = await semanticMatchDocuments(
    request.text,
    caseId,
    userId,
    { limit: limit * 2 }
  );
  const semanticScores = new Map(
    semanticResults.map((r) => [r.documentId, r.similarity])
  );

  // Score each document
  const suggestions: SuggestedMapping[] = [];

  for (const doc of allDocuments) {
    // Skip already-mapped documents
    if (mappedDocIds.includes(doc.id)) continue;

    // Calculate match factors
    const categoryMatch = categoryHint
      ? doc.category?.toLowerCase() === categoryHint.toLowerCase()
      : false;

    const keywordMatch = keywords.some((kw) =>
      doc.fileName.toLowerCase().includes(kw.toLowerCase()) ||
      doc.subtype?.toLowerCase().includes(kw.toLowerCase())
    );

    const dateMatchResult = matchDocumentToDateRange(
      { metadata: doc.metadata as any },
      { startDate: dateRange.startDate, endDate: dateRange.endDate }
    );

    const semanticScore = semanticScores.get(doc.id) || 0;

    // Calculate overall confidence
    let confidence = 0;
    const reasons: string[] = [];

    // Category match: +30 points
    if (categoryMatch) {
      confidence += 30;
      reasons.push(`Category matches: ${doc.category}`);
    }

    // Keyword match: +20 points
    if (keywordMatch) {
      confidence += 20;
      reasons.push("Document name/type matches request keywords");
    }

    // Date match: +20 points (scaled by overlap)
    if (dateMatchResult.matches) {
      const datePoints = Math.round(20 * (dateMatchResult.overlapPercentage / 100));
      confidence += datePoints;
      if (dateMatchResult.overlapPercentage === 100) {
        reasons.push("Date range fully matches request");
      } else {
        reasons.push(`Date range partially matches (${dateMatchResult.overlapPercentage}%)`);
      }
    }

    // Semantic match: up to +40 points
    if (semanticScore > 0) {
      const semanticPoints = Math.round(40 * semanticScore);
      confidence += semanticPoints;
      if (semanticScore > 0.7) {
        reasons.push("High semantic similarity to request");
      } else if (semanticScore > 0.5) {
        reasons.push("Moderate semantic similarity to request");
      }
    }

    // Cap at 100
    confidence = Math.min(confidence, 100);

    // Only include if meets minimum confidence
    if (confidence >= minConfidence) {
      suggestions.push({
        document: {
          id: doc.id,
          fileName: doc.fileName,
          category: doc.category,
          subtype: doc.subtype,
          metadata: doc.metadata as Record<string, any> | null,
        },
        confidence,
        reasoning: reasons.length > 0 ? reasons.join(". ") : "General relevance",
        matchFactors: {
          categoryMatch,
          keywordMatch,
          dateMatch: dateMatchResult.matches,
          semanticScore,
        },
      });
    }
  }

  // Sort by confidence (highest first) and limit
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return {
    requestId,
    suggestions: suggestions.slice(0, limit),
    totalDocumentsSearched: allDocuments.length,
  };
}

/**
 * Create a document-to-request mapping
 */
export async function createDocumentMapping(
  documentId: string,
  requestId: string,
  userId: string,
  source: "ai_suggestion" | "manual_addition",
  confidence?: number,
  reasoning?: string
): Promise<DocumentMapping> {
  // Get the request to get caseId
  const request = await getDiscoveryRequest(requestId, userId);
  if (!request) {
    throw new Error("Discovery request not found");
  }

  // Check for existing mapping
  const [existing] = await db
    .select()
    .from(documentRequestMappingsTable)
    .where(
      and(
        eq(documentRequestMappingsTable.documentId, documentId),
        eq(documentRequestMappingsTable.requestId, requestId)
      )
    );

  if (existing) {
    throw new Error("Document is already mapped to this request");
  }

  // Manual mappings are auto-accepted, AI suggestions need review
  const status = source === "manual_addition" ? "accepted" : "suggested";

  const [mapping] = await db
    .insert(documentRequestMappingsTable)
    .values({
      documentId,
      requestId,
      caseId: request.caseId,
      userId,
      source,
      confidence: confidence ?? null,
      reasoning: reasoning ?? null,
      status,
      reviewedAt: source === "manual_addition" ? new Date() : null,
      reviewedBy: source === "manual_addition" ? userId : null,
    })
    .returning();

  // Update coverage if this is an accepted mapping
  if (status === "accepted") {
    await updateCoverage(requestId, userId);
  }

  return mapping as DocumentMapping;
}

/**
 * Get all mappings for a discovery request
 */
export async function getMappingsForRequest(
  requestId: string,
  userId: string
): Promise<DocumentMapping[]> {
  const mappings = await db
    .select()
    .from(documentRequestMappingsTable)
    .where(
      and(
        eq(documentRequestMappingsTable.requestId, requestId),
        eq(documentRequestMappingsTable.userId, userId)
      )
    )
    .orderBy(desc(documentRequestMappingsTable.createdAt));

  return mappings as DocumentMapping[];
}

/**
 * Get all mappings for a document
 */
export async function getMappingsForDocument(
  documentId: string,
  userId: string
): Promise<DocumentMapping[]> {
  const mappings = await db
    .select()
    .from(documentRequestMappingsTable)
    .where(
      and(
        eq(documentRequestMappingsTable.documentId, documentId),
        eq(documentRequestMappingsTable.userId, userId)
      )
    )
    .orderBy(desc(documentRequestMappingsTable.createdAt));

  return mappings as DocumentMapping[];
}

/**
 * Update mapping status (accept/reject)
 */
export async function updateMappingStatus(
  mappingId: string,
  status: "accepted" | "rejected",
  userId: string
): Promise<DocumentMapping> {
  const [updated] = await db
    .update(documentRequestMappingsTable)
    .set({
      status,
      reviewedAt: new Date(),
      reviewedBy: userId,
    })
    .where(
      and(
        eq(documentRequestMappingsTable.id, mappingId),
        eq(documentRequestMappingsTable.userId, userId)
      )
    )
    .returning();

  if (!updated) {
    throw new Error("Mapping not found or not authorized");
  }

  // Update coverage
  await updateCoverage(updated.requestId, userId);

  return updated as DocumentMapping;
}

/**
 * Delete a mapping
 */
export async function deleteMapping(
  mappingId: string,
  userId: string
): Promise<boolean> {
  const [deleted] = await db
    .delete(documentRequestMappingsTable)
    .where(
      and(
        eq(documentRequestMappingsTable.id, mappingId),
        eq(documentRequestMappingsTable.userId, userId)
      )
    )
    .returning();

  if (deleted) {
    // Update coverage
    await updateCoverage(deleted.requestId, userId);
  }

  return !!deleted;
}

/**
 * Calculate and update coverage percentage for a request
 */
export async function calculateCoveragePercentage(
  requestId: string,
  userId: string
): Promise<number> {
  // Count accepted mappings
  const mappings = await db
    .select()
    .from(documentRequestMappingsTable)
    .where(
      and(
        eq(documentRequestMappingsTable.requestId, requestId),
        eq(documentRequestMappingsTable.userId, userId),
        eq(documentRequestMappingsTable.status, "accepted")
      )
    );

  // For now, having at least one accepted mapping = 100%
  // Future: could compare to expected document count from request analysis
  const coverage = mappings.length > 0 ? 100 : 0;

  return coverage;
}

/**
 * Update coverage and status for a request
 */
async function updateCoverage(requestId: string, userId: string): Promise<void> {
  const coverage = await calculateCoveragePercentage(requestId, userId);

  // Determine status based on coverage
  let status: "incomplete" | "partial" | "complete";
  if (coverage === 0) {
    status = "incomplete";
  } else if (coverage === 100) {
    status = "complete";
  } else {
    status = "partial";
  }

  // Update the request
  await updateDiscoveryRequest(
    requestId,
    {
      completionPercentage: coverage,
      status,
    },
    userId
  );
}

/**
 * Batch create AI suggestions for a request
 */
export async function createAISuggestions(
  requestId: string,
  caseId: string,
  userId: string,
  limit?: number
): Promise<number> {
  const suggestions = await suggestDocumentsForRequest(requestId, caseId, userId, {
    limit: limit ?? 10,
    minConfidence: 50,
  });

  let created = 0;

  for (const suggestion of suggestions.suggestions) {
    try {
      await createDocumentMapping(
        suggestion.document.id,
        requestId,
        userId,
        "ai_suggestion",
        suggestion.confidence,
        suggestion.reasoning
      );
      created++;
    } catch {
      // Skip duplicates or errors
    }
  }

  return created;
}
