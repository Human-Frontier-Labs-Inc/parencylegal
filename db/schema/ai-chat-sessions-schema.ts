import { pgTable, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { casesTable } from "./cases-schema";

export const aiChatSessionsTable = pgTable("ai_chat_sessions", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  caseId: text("case_id").references(() => casesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),

  // Session type
  type: text("type").notNull(), // "classification" | "discovery_mapping" | "gap_detection"

  // OpenAI conversation tracking
  messages: jsonb("messages").$type<Array<{
    role: "system" | "user" | "assistant";
    content: string;
    timestamp: string;
  }>>().default([]),

  // Token usage tracking
  totalInputTokens: integer("total_input_tokens").default(0),
  totalOutputTokens: integer("total_output_tokens").default(0),
  cachedInputTokens: integer("cached_input_tokens").default(0),

  // Cost tracking (in cents)
  totalCost: integer("total_cost").default(0), // Stored in cents

  // Session metadata
  metadata: jsonb("metadata").$type<{
    documentsProcessed?: number;
    requestsProcessed?: number;
    averageConfidence?: number;
    [key: string]: any;
  }>(),

  // Status
  status: text("status").notNull().default("active"), // active | completed | error

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  completedAt: timestamp("completed_at"),
}, (table) => {
  return {
    // Indexes
    caseIdIdx: index("ai_sessions_case_id_idx").on(table.caseId),
    userIdIdx: index("ai_sessions_user_id_idx").on(table.userId),
    typeIdx: index("ai_sessions_type_idx").on(table.type),
    statusIdx: index("ai_sessions_status_idx").on(table.status),

    // Enable RLS
    rls: sql`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,

    readPolicy: sql`
      CREATE POLICY "Users can only view their own AI sessions"
      ON ${table}
      FOR SELECT
      USING (auth.uid()::text = user_id);
    `,

    insertPolicy: sql`
      CREATE POLICY "Service role can insert AI sessions"
      ON ${table}
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
    `,

    updatePolicy: sql`
      CREATE POLICY "Service role can update AI sessions"
      ON ${table}
      FOR UPDATE
      USING (auth.role() = 'service_role');
    `,

    deletePolicy: sql`
      CREATE POLICY "Service role can delete AI sessions"
      ON ${table}
      FOR DELETE
      USING (auth.role() = 'service_role');
    `,
  };
});

export type InsertAIChatSession = typeof aiChatSessionsTable.$inferInsert;
export type SelectAIChatSession = typeof aiChatSessionsTable.$inferSelect;
