import { pgTable, text, timestamp, integer, boolean, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { casesTable } from "./cases-schema";

export const discoveryRequestsTable = pgTable("discovery_requests", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  caseId: text("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(), // Denormalized for faster queries

  // Request details
  type: text("type").notNull(), // "RFP" (Request for Production) or "Interrogatory"
  number: integer("number").notNull(), // e.g., 12 for "RFP 12"
  text: text("text").notNull(), // Full text of the request

  // Category hint for AI matching
  categoryHint: text("category_hint"), // Financial, Medical, etc.

  // Completion tracking
  status: text("status").notNull().default("incomplete"), // incomplete, complete, partial
  completionPercentage: integer("completion_percentage").default(0), // 0-100

  // Metadata
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => {
  return {
    // Indexes
    caseIdIdx: index("discovery_requests_case_id_idx").on(table.caseId),
    userIdIdx: index("discovery_requests_user_id_idx").on(table.userId),
    statusIdx: index("discovery_requests_status_idx").on(table.status),

    // Unique constraint: one request number per type per case
    uniqueNumberPerCase: index("discovery_requests_unique_number").on(table.caseId, table.type, table.number),

    // Enable RLS
    rls: sql`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,

    readPolicy: sql`
      CREATE POLICY "Users can only view their own discovery requests"
      ON ${table}
      FOR SELECT
      USING (auth.uid()::text = user_id);
    `,

    insertPolicy: sql`
      CREATE POLICY "Service role can insert discovery requests"
      ON ${table}
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
    `,

    updatePolicy: sql`
      CREATE POLICY "Service role can update discovery requests"
      ON ${table}
      FOR UPDATE
      USING (auth.role() = 'service_role');
    `,

    deletePolicy: sql`
      CREATE POLICY "Service role can delete discovery requests"
      ON ${table}
      FOR DELETE
      USING (auth.role() = 'service_role');
    `,
  };
});

export type InsertDiscoveryRequest = typeof discoveryRequestsTable.$inferInsert;
export type SelectDiscoveryRequest = typeof discoveryRequestsTable.$inferSelect;
