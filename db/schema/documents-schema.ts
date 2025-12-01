import { pgTable, text, timestamp, integer, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { casesTable } from "./cases-schema";

export const documentsTable = pgTable("documents", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  caseId: text("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(), // Denormalized for faster queries

  // Document source
  source: text("source").notNull().default("dropbox"), // dropbox, manual_upload, parent_app_export

  // Dropbox metadata
  dropboxFileId: text("dropbox_file_id"), // Unique Dropbox file ID
  dropboxPath: text("dropbox_path"), // Full path in Dropbox (lowercase)
  dropboxFilePath: text("dropbox_file_path"), // Full path in Dropbox (display)
  dropboxRev: text("dropbox_rev"), // Dropbox file revision (for change detection)
  dropboxContentHash: text("dropbox_content_hash"), // Content hash for duplicate detection
  syncedAt: timestamp("synced_at"), // When file was last synced from Dropbox

  // File metadata
  fileName: text("file_name").notNull(),
  fileType: text("file_type"), // pdf, docx, jpg, png, etc.
  fileSize: integer("file_size"), // in bytes
  storagePath: text("storage_path").notNull(), // Path in Supabase Storage
  storageUrl: text("storage_url"), // Public/signed URL

  // Document dates
  documentDate: timestamp("document_date"), // Statement date, incident date, etc.
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),

  // AI Classification
  category: text("category"), // Financial, Medical, Legal, Communications, etc.
  subtype: text("subtype"), // Bank Statement, Pay Stub, Court Order, etc.
  confidence: integer("confidence"), // 0-100
  needsReview: boolean("needs_review").default(false), // True if confidence < 80%
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by"), // User ID who reviewed

  // Extracted metadata (JSON)
  metadata: jsonb("metadata").$type<{
    startDate?: string;
    endDate?: string;
    parties?: string[];
    amounts?: number[];
    accountNumbers?: string[];
    summary?: string;
    [key: string]: any;
  }>(),

  // AI-generated professional summaries (Phase 12.2b)
  smartSummary: text("smart_summary"), // 2-3 sentence professional summary for cards
  fullAnalysis: jsonb("full_analysis").$type<{
    overview?: string;
    keyFindings?: string[];
    discoveryRelevance?: string[];
    partiesMentioned?: Array<{ name: string; role: string }>;
    datesCovered?: { start?: string; end?: string };
    financialSummary?: {
      totalAmounts?: number[];
      largestTransaction?: { amount: number; description: string };
      recurringPayments?: string[];
    };
    legalSignificance?: string;
    aiReasoning?: string;
  }>(),

  // Classification history (for audit trail)
  classificationHistory: jsonb("classification_history").$type<Array<{
    timestamp: string;
    category: string;
    subtype: string;
    confidence: number;
    userId?: string;
    source: string; // "ai" | "manual_override"
  }>>(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => {
  return {
    // Indexes
    caseIdIdx: index("documents_case_id_idx").on(table.caseId),
    userIdIdx: index("documents_user_id_idx").on(table.userId),
    categoryIdx: index("documents_category_idx").on(table.category),
    needsReviewIdx: index("documents_needs_review_idx").on(table.needsReview),
    dropboxFileIdIdx: index("documents_dropbox_file_id_idx").on(table.dropboxFileId),

    // Enable RLS
    rls: sql`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,

    readPolicy: sql`
      CREATE POLICY "Users can only view their own documents"
      ON ${table}
      FOR SELECT
      USING (auth.uid()::text = user_id);
    `,

    insertPolicy: sql`
      CREATE POLICY "Service role can insert documents"
      ON ${table}
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
    `,

    updatePolicy: sql`
      CREATE POLICY "Service role can update documents"
      ON ${table}
      FOR UPDATE
      USING (auth.role() = 'service_role');
    `,

    deletePolicy: sql`
      CREATE POLICY "Service role can delete documents"
      ON ${table}
      FOR DELETE
      USING (auth.role() = 'service_role');
    `,
  };
});

export type InsertDocument = typeof documentsTable.$inferInsert;
export type SelectDocument = typeof documentsTable.$inferSelect;
