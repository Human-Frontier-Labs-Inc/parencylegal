import { pgTable, text, timestamp, integer, jsonb, boolean, index} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { casesTable } from "./cases-schema";

export const syncHistoryTable = pgTable("sync_history", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  caseId: text("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),

  // Sync details
  source: text("source").notNull().default("dropbox"), // dropbox | manual_upload
  status: text("status").notNull().default("in_progress"), // in_progress | completed | error

  // Results
  filesFound: integer("files_found").default(0),
  filesNew: integer("files_new").default(0),
  filesUpdated: integer("files_updated").default(0),
  filesSkipped: integer("files_skipped").default(0), // Duplicates
  filesError: integer("files_error").default(0),

  // Error details
  errors: jsonb("errors").$type<Array<{
    file: string;
    error: string;
    timestamp: string;
  }>>(),

  // Duration
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"), // Calculated: completedAt - startedAt

  // Metadata
  metadata: jsonb("metadata").$type<{
    dropboxCursor?: string; // For delta sync
    [key: string]: any;
  }>(),
}, (table) => {
  return {
    // Indexes
    caseIdIdx: index("sync_history_case_id_idx").on(table.caseId),
    userIdIdx: index("sync_history_user_id_idx").on(table.userId),
    statusIdx: index("sync_history_status_idx").on(table.status),
    startedAtIdx: index("sync_history_started_at_idx").on(table.startedAt),

    // Enable RLS
    rls: sql`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,

    readPolicy: sql`
      CREATE POLICY "Users can only view their own sync history"
      ON ${table}
      FOR SELECT
      USING (auth.uid()::text = user_id);
    `,

    insertPolicy: sql`
      CREATE POLICY "Service role can insert sync history"
      ON ${table}
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
    `,

    updatePolicy: sql`
      CREATE POLICY "Service role can update sync history"
      ON ${table}
      FOR UPDATE
      USING (auth.role() = 'service_role');
    `,

    deletePolicy: sql`
      CREATE POLICY "Service role can delete sync history"
      ON ${table}
      FOR DELETE
      USING (auth.role() = 'service_role');
    `,
  };
});

export type InsertSyncHistory = typeof syncHistoryTable.$inferInsert;
export type SelectSyncHistory = typeof syncHistoryTable.$inferSelect;
