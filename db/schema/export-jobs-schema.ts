/**
 * Export Jobs Schema
 * Phase 9: Timeline, Search & Export
 *
 * Tracks PDF export jobs for background processing
 */

import { pgTable, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { casesTable } from "./cases-schema";

export const EXPORT_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type ExportStatus = (typeof EXPORT_STATUS)[keyof typeof EXPORT_STATUS];

export const EXPORT_TYPE = {
  CATEGORY: "category",
  DISCOVERY: "discovery",
  TIMELINE: "timeline",
} as const;

export type ExportType = (typeof EXPORT_TYPE)[keyof typeof EXPORT_TYPE];

export interface ExportOptions {
  format: "pdf" | "csv" | "xlsx";
  includeMetadata: boolean;
  includeTableOfContents: boolean;
  includeCoverPage: boolean;
  groupBy: "category" | "date" | "none";
  sortBy: "date" | "category" | "name";
  sortOrder: "asc" | "desc";
}

export interface ExportResult {
  url?: string;
  fileName?: string;
  fileSize?: number;
  pageCount?: number;
  documentCount: number;
  generatedAt: string;
  expiresAt?: string;
  error?: string;
}

export const exportJobsTable = pgTable("export_jobs", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  caseId: text("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),

  // Job type and configuration
  type: text("type").notNull().$type<ExportType>(), // category, discovery, timeline
  status: text("status").notNull().default(EXPORT_STATUS.PENDING).$type<ExportStatus>(),
  progress: integer("progress").default(0), // 0-100

  // Export configuration
  config: jsonb("config").$type<{
    categories?: string[];
    requestIds?: string[];
    options?: Partial<ExportOptions>;
  }>(),

  // Result data
  result: jsonb("result").$type<ExportResult>(),

  // Storage path for generated file
  storagePath: text("storage_path"),

  // Error tracking
  errorMessage: text("error_message"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"), // When the export file will be deleted
}, (table) => {
  return {
    // Indexes
    caseIdIdx: index("export_jobs_case_id_idx").on(table.caseId),
    userIdIdx: index("export_jobs_user_id_idx").on(table.userId),
    statusIdx: index("export_jobs_status_idx").on(table.status),

    // Enable RLS
    rls: sql`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,

    readPolicy: sql`
      CREATE POLICY "Users can only view their own export jobs"
      ON ${table}
      FOR SELECT
      USING (auth.uid()::text = user_id);
    `,

    insertPolicy: sql`
      CREATE POLICY "Service role can insert export jobs"
      ON ${table}
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
    `,

    updatePolicy: sql`
      CREATE POLICY "Service role can update export jobs"
      ON ${table}
      FOR UPDATE
      USING (auth.role() = 'service_role');
    `,

    deletePolicy: sql`
      CREATE POLICY "Service role can delete export jobs"
      ON ${table}
      FOR DELETE
      USING (auth.role() = 'service_role');
    `,
  };
});

export type InsertExportJob = typeof exportJobsTable.$inferInsert;
export type SelectExportJob = typeof exportJobsTable.$inferSelect;
