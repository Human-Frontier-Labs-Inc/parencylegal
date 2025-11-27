/**
 * Embedding Service
 * Phase 5: Document Intelligence (RAG)
 *
 * Generates embeddings using OpenAI API
 */

import OpenAI from 'openai';
import { db } from '@/db/db';
import { documentChunksTable } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { DocumentChunk } from './chunking';
import { DEFAULT_EMBEDDING_MODEL, DEFAULT_DIMENSIONS } from '@/db/schema/document-chunks-schema';

// Get embedding model from environment or use default
export function getEmbeddingModel(): string {
  return process.env.OPENAI_MODEL_EMBEDDING || DEFAULT_EMBEDDING_MODEL;
}

// Cost per 1M tokens for embedding models
const EMBEDDING_COSTS: Record<string, number> = {
  'text-embedding-3-small': 0.02,
  'text-embedding-3-large': 0.13,
  'text-embedding-ada-002': 0.10,
};

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is required');
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface EmbeddingResult {
  embedding: number[];
  tokensUsed: number;
  model: string;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const client = getClient();
  const model = getEmbeddingModel();

  const response = await client.embeddings.create({
    model,
    input: text,
  });

  return {
    embedding: response.data[0].embedding,
    tokensUsed: response.usage.total_tokens,
    model,
  };
}

/**
 * Generate embeddings for multiple texts (batch)
 * OpenAI supports up to 2048 inputs per request
 */
export async function batchGenerateEmbeddings(
  texts: string[],
  batchSize: number = 100
): Promise<EmbeddingResult[]> {
  const client = getClient();
  const model = getEmbeddingModel();
  const results: EmbeddingResult[] = [];

  // Process in batches
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await client.embeddings.create({
      model,
      input: batch,
    });

    const tokensPerText = Math.ceil(response.usage.total_tokens / batch.length);

    for (const item of response.data) {
      results.push({
        embedding: item.embedding,
        tokensUsed: tokensPerText,
        model,
      });
    }
  }

  return results;
}

/**
 * Store chunks with embeddings in the database
 */
export async function storeChunksWithEmbeddings(
  documentId: string,
  caseId: string,
  userId: string,
  chunks: DocumentChunk[]
): Promise<{ stored: number; tokensUsed: number }> {
  if (chunks.length === 0) return { stored: 0, tokensUsed: 0 };

  // Generate embeddings for all chunks
  const texts = chunks.map(c => c.content);
  const embeddings = await batchGenerateEmbeddings(texts);

  let totalTokens = 0;

  // Store each chunk with its embedding
  const values = chunks.map((chunk, i) => {
    totalTokens += embeddings[i].tokensUsed;
    return {
      documentId,
      caseId,
      userId,
      chunkIndex: chunk.index,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
      embedding: embeddings[i].embedding,
      metadata: {
        ...chunk.metadata,
        embeddingModel: embeddings[i].model,
      },
    };
  });

  await db.insert(documentChunksTable).values(values);

  return { stored: chunks.length, tokensUsed: totalTokens };
}

/**
 * Delete all chunks for a document (for re-processing)
 */
export async function deleteDocumentChunks(documentId: string): Promise<number> {
  const result = await db
    .delete(documentChunksTable)
    .where(eq(documentChunksTable.documentId, documentId))
    .returning({ id: documentChunksTable.id });

  return result.length;
}

export interface SimilarChunk {
  id: string;
  documentId: string;
  content: string;
  similarity: number;
  metadata: any;
  chunkIndex: number;
}

/**
 * Find similar chunks using vector similarity search
 */
export async function findSimilarChunks(
  caseId: string,
  queryEmbedding: number[],
  limit: number = 5,
  minSimilarity: number = 0.7
): Promise<SimilarChunk[]> {
  // Use raw SQL for vector similarity search
  // 1 - cosine_distance = cosine_similarity
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  try {
    // Note: With postgres.js driver, db.execute returns the array directly (not { rows: [...] })
    const result = await db.execute(sql`
      SELECT
        id,
        document_id as "documentId",
        content,
        metadata,
        chunk_index as "chunkIndex",
        1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM document_chunks
      WHERE case_id = ${caseId}
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> ${embeddingStr}::vector) >= ${minSimilarity}
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${limit}
    `);

    // postgres.js returns array directly, other drivers return { rows: [...] }
    // Handle both cases for safety
    const rows = Array.isArray(result) ? result : (result as any).rows || [];

    console.log(`[Embeddings] findSimilarChunks found ${rows.length} chunks for case ${caseId}`);

    return rows as SimilarChunk[];
  } catch (error) {
    console.error('[Embeddings] findSimilarChunks error:', error);
    // Return empty array on error (e.g., table doesn't exist yet, no embeddings)
    return [];
  }
}

/**
 * Semantic search: query text -> embedding -> similar chunks
 */
export async function semanticSearch(
  caseId: string,
  query: string,
  limit: number = 5,
  minSimilarity: number = 0.7
): Promise<{
  chunks: SimilarChunk[];
  query: string;
  tokensUsed: number;
}> {
  console.log(`[Embeddings] semanticSearch starting for case ${caseId}, query: "${query.substring(0, 50)}..."`);

  // Generate embedding for query
  const { embedding, tokensUsed } = await generateEmbedding(query);
  console.log(`[Embeddings] Generated query embedding, ${tokensUsed} tokens, ${embedding.length} dimensions`);

  // Find similar chunks
  const chunks = await findSimilarChunks(caseId, embedding, limit, minSimilarity);
  console.log(`[Embeddings] semanticSearch returning ${chunks.length} chunks`);

  return {
    chunks,
    query,
    tokensUsed,
  };
}

/**
 * Calculate embedding cost in cents
 */
export function calculateEmbeddingCost(tokensUsed: number, model?: string): number {
  const embeddingModel = model || getEmbeddingModel();
  const costPerMillion = EMBEDDING_COSTS[embeddingModel] || 0.02;
  return (tokensUsed / 1_000_000) * costPerMillion * 100; // Convert to cents
}
