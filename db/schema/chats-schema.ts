/**
 * Chats and Chat Messages Schema
 * Phase 6: Multiple chats per case with proper message storage
 *
 * Replaces the JSONB-based ai_chat_sessions for chat conversations
 */

import { pgTable, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { casesTable } from "./cases-schema";

/**
 * Chats table - one per conversation thread
 */
export const chatsTable = pgTable("chats", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  caseId: text("case_id").notNull().references(() => casesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),

  // Chat metadata
  title: text("title"), // Auto-generated from first message or user-set
  status: text("status").notNull().default("active"), // active | archived

  // Token usage tracking (cumulative for the chat)
  totalInputTokens: integer("total_input_tokens").default(0),
  totalOutputTokens: integer("total_output_tokens").default(0),
  totalCost: integer("total_cost").default(0), // In cents

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => {
  return {
    caseIdIdx: index("chats_case_id_idx").on(table.caseId),
    userIdIdx: index("chats_user_id_idx").on(table.userId),
    statusIdx: index("chats_status_idx").on(table.status),
    updatedAtIdx: index("chats_updated_at_idx").on(table.updatedAt),
  };
});

/**
 * Chat Messages table - individual messages with source citations
 */
export const chatMessagesTable = pgTable("chat_messages", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  chatId: text("chat_id").notNull().references(() => chatsTable.id, { onDelete: "cascade" }),

  // Message content
  role: text("role").notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),

  // Source citations for RAG responses
  sources: jsonb("sources").$type<Array<{
    documentId: string;
    documentName: string;
    chunkId?: string;
    excerpt: string;
    similarity: number;
    pageNumber?: number;
  }>>(),

  // Token usage for this message
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  contextTokens: integer("context_tokens"), // Tokens used for RAG context
  model: text("model"), // Model used for this response

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    chatIdIdx: index("chat_messages_chat_id_idx").on(table.chatId),
    roleIdx: index("chat_messages_role_idx").on(table.role),
    createdAtIdx: index("chat_messages_created_at_idx").on(table.createdAt),
  };
});

// Types
export type InsertChat = typeof chatsTable.$inferInsert;
export type SelectChat = typeof chatsTable.$inferSelect;
export type InsertChatMessage = typeof chatMessagesTable.$inferInsert;
export type SelectChatMessage = typeof chatMessagesTable.$inferSelect;
