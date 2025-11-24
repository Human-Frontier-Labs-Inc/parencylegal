import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const dropboxConnectionsTable = pgTable("dropbox_connections", {
  id: text("id").primaryKey().notNull().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().unique(), // One Dropbox connection per user

  // OAuth tokens (encrypted in production)
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),

  // Dropbox account info
  dropboxAccountId: text("dropbox_account_id").notNull(),
  dropboxEmail: text("dropbox_email"),
  dropboxDisplayName: text("dropbox_display_name"),

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
    userIdIdx: index("dropbox_connections_user_id_idx").on(table.userId),
    isActiveIdx: index("dropbox_connections_is_active_idx").on(table.isActive),

    // Enable RLS
    rls: sql`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,

    readPolicy: sql`
      CREATE POLICY "Users can only view their own Dropbox connection"
      ON ${table}
      FOR SELECT
      USING (auth.uid()::text = user_id);
    `,

    insertPolicy: sql`
      CREATE POLICY "Service role can insert Dropbox connections"
      ON ${table}
      FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
    `,

    updatePolicy: sql`
      CREATE POLICY "Service role can update Dropbox connections"
      ON ${table}
      FOR UPDATE
      USING (auth.role() = 'service_role');
    `,

    deletePolicy: sql`
      CREATE POLICY "Service role can delete Dropbox connections"
      ON ${table}
      FOR DELETE
      USING (auth.role() = 'service_role');
    `,
  };
});

export type InsertDropboxConnection = typeof dropboxConnectionsTable.$inferInsert;
export type SelectDropboxConnection = typeof dropboxConnectionsTable.$inferSelect;
