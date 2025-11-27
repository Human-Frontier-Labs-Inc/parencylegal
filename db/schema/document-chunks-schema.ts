/**
 * Document Chunks Schema
 * Phase 5: Document Intelligence (RAG)
 *
 * Stores document text chunks with embeddings for semantic search
 */

import { pgTable, text, timestamp, integer, jsonb, index, vector } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { documentsTable } from "./documents-schema";
import { casesTable } from "./cases-schema";

// Embedding dimensions for different models
export const EMBEDDING_DIMENSIONS = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
} as const;

// Default to text-embedding-3-small for cost efficiency
export const DEFAULT_EMBEDDING_MODEL = 'text-embedding-3-small' as const;
export const DEFAULT_DIMENSIONS = EMBEDDING_DIMENSIONS[DEFAULT_EMBEDDING_MODEL];

export const documentChunksTable = pgTable("document_chunks", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  documentId: text("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  caseId: text("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(), // Denormalized for faster queries

  // Chunk details
  chunkIndex: integer("chunk_index").notNull(), // Order within document
  content: text("content").notNull(), // The actual text content
  tokenCount: integer("token_count"), // Number of tokens in chunk

  // Vector embedding (1536 dimensions for text-embedding-3-small)
  // Note: pgvector extension must be enabled in Supabase
  embedding: vector("embedding", { dimensions: DEFAULT_DIMENSIONS }),

  // Metadata
  metadata: jsonb("metadata").$type<{
    pageNumber?: number;
    section?: string;
    header?: string;
    startChar?: number;
    endChar?: number;
    embeddingModel?: string;
    [key: string]: any;
  }>(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    // Indexes for filtering
    documentIdIdx: index("document_chunks_document_id_idx").on(table.documentId),
    caseIdIdx: index("document_chunks_case_id_idx").on(table.caseId),
    userIdIdx: index("document_chunks_user_id_idx").on(table.userId),
    chunkOrderIdx: index("document_chunks_order_idx").on(table.documentId, table.chunkIndex),

    // Vector similarity search index (HNSW is faster than IVFFlat for most use cases)
    // This will be created via SQL migration since drizzle doesn't support it directly
    // embeddingIdx: sql`CREATE INDEX document_chunks_embedding_idx ON document_chunks USING hnsw (embedding vector_cosine_ops)`,

    // Enable RLS
    rls: sql`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,

    readPolicy: sql`
      CREATE POLICY "Users can only view their own document chunks"
      ON ${table}
      FOR SELECT
      USING (auth.uid()::text = user_id);
    `,

    insertPolicy: sql`
      CREATE POLICY "Service role can insert document chunks"
      ON ${table}
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
    `,

    deletePolicy: sql`
      CREATE POLICY "Service role can delete document chunks"
      ON ${table}
      FOR DELETE
      USING (auth.role() = 'service_role');
    `,
  };
});

export type InsertDocumentChunk = typeof documentChunksTable.$inferInsert;
export type SelectDocumentChunk = typeof documentChunksTable.$inferSelect;
