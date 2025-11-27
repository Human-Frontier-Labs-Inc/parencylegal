/**
 * Document Processing Queue Schema
 * Phase 4: Auto-Classification & Configurable Models
 * Tracks documents pending classification
 */

import { pgTable, text, timestamp, integer, index, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { documentsTable } from "./documents-schema";
import { casesTable } from "./cases-schema";

// Processing status enum
export const processingStatusEnum = pgEnum('processing_status', [
  'pending',
  'processing',
  'completed',
  'failed',
]);

export const documentProcessingQueueTable = pgTable("document_processing_queue", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),

  // Foreign keys
  documentId: text("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  caseId: text("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),

  // Processing status
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  priority: integer("priority").notNull().default(0), // Higher = more urgent

  // Tracking
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  errorMessage: text("error_message"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  nextRetryAt: timestamp("next_retry_at"),

  // Processing metadata
  processingTimeMs: integer("processing_time_ms"),
  tokensUsed: integer("tokens_used"),
  modelUsed: text("model_used"),
}, (table) => {
  return {
    // Indexes for efficient queue operations
    statusIdx: index("dpq_status_idx").on(table.status),
    caseIdIdx: index("dpq_case_id_idx").on(table.caseId),
    documentIdIdx: index("dpq_document_id_idx").on(table.documentId),
    priorityStatusIdx: index("dpq_priority_status_idx").on(table.priority, table.status),
    nextRetryIdx: index("dpq_next_retry_idx").on(table.nextRetryAt),

    // Enable RLS
    rls: sql`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,

    // Policies
    readPolicy: sql`
      CREATE POLICY "Users can view their queue items"
      ON ${table}
      FOR SELECT
      USING (auth.uid()::text = user_id);
    `,

    insertPolicy: sql`
      CREATE POLICY "Service role can insert queue items"
      ON ${table}
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
    `,

    updatePolicy: sql`
      CREATE POLICY "Service role can update queue items"
      ON ${table}
      FOR UPDATE
      USING (auth.role() = 'service_role');
    `,

    deletePolicy: sql`
      CREATE POLICY "Service role can delete queue items"
      ON ${table}
      FOR DELETE
      USING (auth.role() = 'service_role');
    `,
  };
});

export type InsertDocumentProcessingQueue = typeof documentProcessingQueueTable.$inferInsert;
export type SelectDocumentProcessingQueue = typeof documentProcessingQueueTable.$inferSelect;

// Status constants for type safety
export const QUEUE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type QueueStatus = typeof QUEUE_STATUS[keyof typeof QUEUE_STATUS];
