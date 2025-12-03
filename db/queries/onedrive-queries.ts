/**
 * OneDrive Database Queries
 * Handles CRUD operations for OneDrive connections
 */

import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import {
  onedriveConnectionsTable,
  InsertOnedriveConnection,
  SelectOnedriveConnection,
} from "@/db/schema/onedrive-connections-schema";
import { CloudStorageTokens, CloudStorageAccountInfo } from "@/lib/cloud-storage/types";

/**
 * Check if user has an active OneDrive connection
 */
export async function hasOnedriveConnection(userId: string): Promise<boolean> {
  const connection = await db.query.onedriveConnectionsTable.findFirst({
    where: eq(onedriveConnectionsTable.userId, userId),
    columns: { isActive: true },
  });

  return connection?.isActive ?? false;
}

/**
 * Get OneDrive connection for a user
 */
export async function getOnedriveConnection(
  userId: string
): Promise<SelectOnedriveConnection | null> {
  const connection = await db.query.onedriveConnectionsTable.findFirst({
    where: eq(onedriveConnectionsTable.userId, userId),
  });

  return connection ?? null;
}

/**
 * Get OneDrive connection status for a user
 */
export async function getOnedriveConnectionStatus(userId: string): Promise<{
  connected: boolean;
  accountEmail: string | null;
  accountName: string | null;
  lastVerifiedAt: Date | null;
  needsReauth: boolean;
} | null> {
  try {
    const connection = await getOnedriveConnection(userId);

    if (!connection) {
      return {
        connected: false,
        accountEmail: null,
        accountName: null,
        lastVerifiedAt: null,
        needsReauth: false,
      };
    }

    const needsReauth = isTokenExpired(connection);

    return {
      connected: connection.isActive,
      accountEmail: connection.microsoftEmail,
      accountName: connection.microsoftDisplayName,
      lastVerifiedAt: connection.lastVerifiedAt,
      needsReauth,
    };
  } catch (error) {
    console.error("Error getting OneDrive connection status:", error);
    return null;
  }
}

/**
 * Save or update OneDrive connection
 */
export async function saveOnedriveConnection(
  userId: string,
  tokens: CloudStorageTokens,
  accountInfo?: CloudStorageAccountInfo
): Promise<SelectOnedriveConnection> {
  // Calculate token expiration time
  const tokenExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

  // Check for existing connection
  const existing = await getOnedriveConnection(userId);

  if (existing) {
    // Update existing connection
    const [updated] = await db
      .update(onedriveConnectionsTable)
      .set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || existing.refreshToken,
        tokenExpiresAt,
        microsoftAccountId: tokens.accountId || existing.microsoftAccountId,
        microsoftEmail: accountInfo?.email || existing.microsoftEmail,
        microsoftDisplayName: accountInfo?.displayName || existing.microsoftDisplayName,
        isActive: true,
        lastVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(onedriveConnectionsTable.userId, userId))
      .returning();

    return updated;
  }

  // Create new connection
  const [newConnection] = await db
    .insert(onedriveConnectionsTable)
    .values({
      userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt,
      microsoftAccountId: tokens.accountId,
      microsoftEmail: accountInfo?.email || null,
      microsoftDisplayName: accountInfo?.displayName || null,
      isActive: true,
      lastVerifiedAt: new Date(),
    })
    .returning();

  return newConnection;
}

/**
 * Update OneDrive tokens after refresh
 */
export async function updateOnedriveTokens(
  userId: string,
  tokens: CloudStorageTokens
): Promise<void> {
  const tokenExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

  await db
    .update(onedriveConnectionsTable)
    .set({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || undefined,
      tokenExpiresAt,
      lastVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(onedriveConnectionsTable.userId, userId));
}

/**
 * Disconnect OneDrive (mark as inactive)
 */
export async function disconnectOnedrive(userId: string): Promise<boolean> {
  const result = await db
    .update(onedriveConnectionsTable)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(onedriveConnectionsTable.userId, userId))
    .returning({ id: onedriveConnectionsTable.id });

  return result.length > 0;
}

/**
 * Delete OneDrive connection entirely
 */
export async function deleteOnedriveConnection(userId: string): Promise<boolean> {
  const result = await db
    .delete(onedriveConnectionsTable)
    .where(eq(onedriveConnectionsTable.userId, userId))
    .returning({ id: onedriveConnectionsTable.id });

  return result.length > 0;
}

/**
 * Check if token is expired or will expire soon (within 5 minutes)
 */
export function isTokenExpired(connection: SelectOnedriveConnection): boolean {
  if (!connection.tokenExpiresAt) {
    return true;
  }

  // Consider expired if within 5 minutes of expiration
  const bufferMs = 5 * 60 * 1000;
  return connection.tokenExpiresAt.getTime() - bufferMs < Date.now();
}

/**
 * Update last verified timestamp
 */
export async function updateOnedriveLastVerified(userId: string): Promise<void> {
  await db
    .update(onedriveConnectionsTable)
    .set({
      lastVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(onedriveConnectionsTable.userId, userId));
}
