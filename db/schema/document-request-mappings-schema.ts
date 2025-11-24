import { pgTable, text, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { documentsTable } from "./documents-schema";
import { discoveryRequestsTable } from "./discovery-requests-schema";

export const documentRequestMappingsTable = pgTable("document_request_mappings", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),

  // Relations
  documentId: text("document_id").notNull().references(() => documentsTable.id, { onDelete: "cascade" }),
  requestId: text("request_id").notNull().references(() => discoveryRequestsTable.id, { onDelete: "cascade" }),

  caseId: text("case_id").notNull(), // Denormalized for faster queries
  userId: text("user_id").notNull(), // Denormalized for faster queries

  // AI Suggestion or Manual
  source: text("source").notNull(), // "ai_suggestion" | "manual_addition"
  confidence: integer("confidence"), // 0-100 (only for AI suggestions)
  reasoning: text("reasoning"), // AI's reasoning for the mapping

  // Review status
  status: text("status").notNull().default("suggested"), // suggested, accepted, rejected
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by"), // User ID who reviewed

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => {
  return {
    // Indexes
    documentIdIdx: index("document_mappings_document_id_idx").on(table.documentId),
    requestIdIdx: index("document_mappings_request_id_idx").on(table.requestId),
    caseIdIdx: index("document_mappings_case_id_idx").on(table.caseId),
    statusIdx: index("document_mappings_status_idx").on(table.status),

    // Unique constraint: one mapping per document-request pair
    uniqueMapping: index("document_mappings_unique").on(table.documentId, table.requestId),

    // Enable RLS
    rls: sql`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,

    readPolicy: sql`
      CREATE POLICY "Users can only view their own mappings"
      ON ${table}
      FOR SELECT
      USING (auth.uid()::text = user_id);
    `,

    insertPolicy: sql`
      CREATE POLICY "Service role can insert mappings"
      ON ${table}
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
    `,

    updatePolicy: sql`
      CREATE POLICY "Service role can update mappings"
      ON ${table}
      FOR UPDATE
      USING (auth.role() = 'service_role');
    `,

    deletePolicy: sql`
      CREATE POLICY "Service role can delete mappings"
      ON ${table}
      FOR DELETE
      USING (auth.role() = 'service_role');
    `,
  };
});

export type InsertDocumentRequestMapping = typeof documentRequestMappingsTable.$inferInsert;
export type SelectDocumentRequestMapping = typeof documentRequestMappingsTable.$inferSelect;
