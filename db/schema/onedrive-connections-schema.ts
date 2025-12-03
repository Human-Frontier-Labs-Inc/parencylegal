import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const onedriveConnectionsTable = pgTable("onedrive_connections", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique(), // One OneDrive connection per user

  // OAuth tokens (encrypted in production)
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),

  // Microsoft account info
  microsoftAccountId: text("microsoft_account_id").notNull(),
  microsoftEmail: text("microsoft_email"),
  microsoftDisplayName: text("microsoft_display_name"),

  // Connection status
  isActive: boolean("is_active").default(true).notNull(),
  lastVerifiedAt: timestamp("last_verified_at"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}, (table) => {
  return {
    // Indexes
    userIdIdx: index("onedrive_connections_user_id_idx").on(table.userId),
    isActiveIdx: index("onedrive_connections_is_active_idx").on(table.isActive),
  };
});

export type InsertOnedriveConnection = typeof onedriveConnectionsTable.$inferInsert;
export type SelectOnedriveConnection = typeof onedriveConnectionsTable.$inferSelect;
