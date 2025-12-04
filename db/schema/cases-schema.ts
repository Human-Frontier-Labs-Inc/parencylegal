import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const casesTable = pgTable("cases", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(), // Clerk user ID

  // Case details
  name: text("name").notNull(), // e.g., "Smith v. Smith"
  clientName: text("client_name"), // e.g., "Jane Smith"
  opposingParty: text("opposing_party"), // e.g., "John Smith"
  caseNumber: text("case_number"), // Court case number
  status: text("status").notNull().default("active"), // active, discovery, trial_prep, settlement, closed

  // Cloud storage integration (provider-agnostic)
  cloudStorageProvider: text("cloud_storage_provider"), // 'dropbox' | 'onedrive' | null
  cloudFolderPath: text("cloud_folder_path"), // e.g., "/Clients/Smith/Divorce"
  cloudFolderId: text("cloud_folder_id"), // Provider-specific folder ID
  lastSyncedAt: timestamp("last_synced_at"),

  // Legacy Dropbox fields (for backward compatibility)
  dropboxFolderPath: text("dropbox_folder_path"), // @deprecated - use cloudFolderPath
  dropboxFolderId: text("dropbox_folder_id"), // @deprecated - use cloudFolderId

  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => {
  return {
    // Indexes for better query performance
    userIdIdx: index("cases_user_id_idx").on(table.userId),
    statusIdx: index("cases_status_idx").on(table.status),

    // Enable RLS on this table
    rls: sql`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,

    // Users can only view their own cases
    readPolicy: sql`
      CREATE POLICY "Users can only view their own cases"
      ON ${table}
      FOR SELECT
      USING (auth.uid()::text = user_id);
    `,

    // Users can insert their own cases (via service role)
    insertPolicy: sql`
      CREATE POLICY "Service role can insert cases"
      ON ${table}
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
    `,

    // Users can update their own cases (via service role)
    updatePolicy: sql`
      CREATE POLICY "Service role can update cases"
      ON ${table}
      FOR UPDATE
      USING (auth.role() = 'service_role');
    `,

    // Users can delete their own cases (via service role)
    deletePolicy: sql`
      CREATE POLICY "Service role can delete cases"
      ON ${table}
      FOR DELETE
      USING (auth.role() = 'service_role');
    `,
  };
});

export type InsertCase = typeof casesTable.$inferInsert;
export type SelectCase = typeof casesTable.$inferSelect;
