/**
 * Semantic Matching for Discovery Requests
 * Phase 8: Discovery Request Tracking
 *
 * Use embeddings to find semantically similar documents
 */

import { db } from "@/db/db";
import { documentChunksTable, documentsTable } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { generateEmbedding } from "@/lib/ai/embeddings";

export interface SemanticMatchResult {
  documentId: string;
  fileName: string;
  category: string | null;
  subtype: string | null;
  similarity: number;
  matchingChunks: Array<{
    chunkId: string;
    content: string;
    similarity: number;
  }>;
}

/**
 * Find documents semantically similar to request text
 */
export async function semanticMatchDocuments(
  requestText: string,
  caseId: string,
  userId: string,
  options?: {
    minSimilarity?: number;
    limit?: number;
  }
): Promise<SemanticMatchResult[]> {
  const minSimilarity = options?.minSimilarity ?? 0.3;
  const limit = options?.limit ?? 20;

  try {
    // Generate embedding for the request text
    const embeddingResult = await generateEmbedding(requestText);
    const embeddingVector = `[${embeddingResult.embedding.join(',')}]`;

    // Query for similar chunks using cosine similarity
    const result = await db.execute(sql`
      SELECT
        dc.id as chunk_id,
        dc.document_id,
        dc.content,
        d.file_name,
        d.category,
        d.subtype,
        1 - (dc.embedding <=> ${embeddingVector}::vector) as similarity
      FROM document_chunks dc
      JOIN documents d ON dc.document_id = d.id
      WHERE d.case_id = ${caseId}
        AND d.user_id = ${userId}
        AND dc.embedding IS NOT NULL
        AND 1 - (dc.embedding <=> ${embeddingVector}::vector) >= ${minSimilarity}
      ORDER BY similarity DESC
      LIMIT ${limit * 3}
    `);

    // postgres.js returns array directly, other drivers return { rows: [...] }
    // Handle both cases for safety
    const rows = Array.isArray(result) ? result : (result as any).rows || [];

    // Group by document and calculate document-level similarity
    const documentMap = new Map<string, SemanticMatchResult>();

    for (const row of rows as any[]) {
      const docId = row.document_id;

      if (!documentMap.has(docId)) {
        documentMap.set(docId, {
          documentId: docId,
          fileName: row.file_name,
          category: row.category,
          subtype: row.subtype,
          similarity: 0,
          matchingChunks: [],
        });
      }

      const doc = documentMap.get(docId)!;
      doc.matchingChunks.push({
        chunkId: row.chunk_id,
        content: row.content,
        similarity: parseFloat(row.similarity),
      });

      // Update document similarity (max of chunks)
      doc.similarity = Math.max(doc.similarity, parseFloat(row.similarity));
    }

    // Convert to array and sort by similarity
    const resultArray = Array.from(documentMap.values())
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return resultArray;
  } catch (error: any) {
    console.error("[SemanticMatch] Error:", error);
    return [];
  }
}

/**
 * Get semantic match score for a specific document against request text
 */
export async function getDocumentMatchScore(
  documentId: string,
  requestText: string
): Promise<number> {
  try {
    // Generate embedding for the request text
    const embeddingResult = await generateEmbedding(requestText);
    const embeddingVector = `[${embeddingResult.embedding.join(',')}]`;

    // Get best matching chunk for this document
    const result = await db.execute(sql`
      SELECT
        MAX(1 - (embedding <=> ${embeddingVector}::vector)) as max_similarity
      FROM document_chunks
      WHERE document_id = ${documentId}
        AND embedding IS NOT NULL
    `);

    // postgres.js returns array directly, other drivers return { rows: [...] }
    const rows = Array.isArray(result) ? result : (result as any).rows || [];
    if (rows.length > 0 && rows[0].max_similarity !== null) {
      return parseFloat(rows[0].max_similarity);
    }

    return 0;
  } catch (error: any) {
    console.error("[SemanticMatch] Score error:", error);
    return 0;
  }
}

/**
 * Batch match multiple documents against request text
 */
export async function batchDocumentMatchScores(
  documentIds: string[],
  requestText: string
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();

  if (documentIds.length === 0) {
    return scores;
  }

  try {
    // Generate embedding for the request text
    const embeddingResult = await generateEmbedding(requestText);
    const embeddingVector = `[${embeddingResult.embedding.join(',')}]`;

    // Query for all documents at once
    const result = await db.execute(sql`
      SELECT
        document_id,
        MAX(1 - (embedding <=> ${embeddingVector}::vector)) as max_similarity
      FROM document_chunks
      WHERE document_id = ANY(${documentIds}::text[])
        AND embedding IS NOT NULL
      GROUP BY document_id
    `);

    // postgres.js returns array directly, other drivers return { rows: [...] }
    const rows = Array.isArray(result) ? result : (result as any).rows || [];
    for (const row of rows as any[]) {
      scores.set(row.document_id, parseFloat(row.max_similarity) || 0);
    }

    // Fill in zeros for documents with no embeddings
    for (const docId of documentIds) {
      if (!scores.has(docId)) {
        scores.set(docId, 0);
      }
    }

    return scores;
  } catch (error: any) {
    console.error("[SemanticMatch] Batch error:", error);
    // Return zeros on error
    for (const docId of documentIds) {
      scores.set(docId, 0);
    }
    return scores;
  }
}
