/**
 * Dropbox Connection Database Queries
 * Handles CRUD operations for Dropbox OAuth connections
 */

import { db } from "@/db/db";
import { dropboxConnectionsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  encryptToken,
  decryptToken,
  getDropboxAccountInfo,
  revokeDropboxToken,
  type DropboxTokens,
} from "@/lib/dropbox/oauth";

export interface DropboxConnection {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  dropboxAccountId: string;
  dropboxEmail: string | null;
  dropboxDisplayName: string | null;
  isActive: boolean;
  lastVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get Dropbox connection for a user
 */
export async function getDropboxConnection(
  userId: string
): Promise<DropboxConnection | null> {
  try {
    const [connection] = await db
      .select()
      .from(dropboxConnectionsTable)
      .where(
        and(
          eq(dropboxConnectionsTable.userId, userId),
          eq(dropboxConnectionsTable.isActive, true)
        )
      )
      .limit(1);

    if (!connection) {
      return null;
    }

    // Decrypt tokens before returning
    return {
      ...connection,
      accessToken: decryptToken(connection.accessToken),
      refreshToken: connection.refreshToken
        ? decryptToken(connection.refreshToken)
        : null,
    };
  } catch (error) {
    console.error("Error getting Dropbox connection:", error);
    throw new Error("Failed to retrieve Dropbox connection");
  }
}

/**
 * Save a new Dropbox connection
 */
export async function saveDropboxConnection(
  userId: string,
  tokens: DropboxTokens
): Promise<DropboxConnection> {
  try {
    // Get account info from Dropbox
    const accountInfo = await getDropboxAccountInfo(tokens.access_token);

    // Calculate token expiration time
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Check if connection already exists for this user
    const existing = await db
      .select()
      .from(dropboxConnectionsTable)
      .where(eq(dropboxConnectionsTable.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      // Update existing connection
      const [updated] = await db
        .update(dropboxConnectionsTable)
        .set({
          accessToken: encryptToken(tokens.access_token),
          refreshToken: tokens.refresh_token
            ? encryptToken(tokens.refresh_token)
            : null,
          tokenExpiresAt,
          dropboxAccountId: accountInfo.accountId,
          dropboxEmail: accountInfo.email,
          dropboxDisplayName: accountInfo.displayName,
          isActive: true,
          lastVerifiedAt: new Date(),
        })
        .where(eq(dropboxConnectionsTable.userId, userId))
        .returning();

      return {
        ...updated,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
      };
    }

    // Create new connection
    const [connection] = await db
      .insert(dropboxConnectionsTable)
      .values({
        userId,
        accessToken: encryptToken(tokens.access_token),
        refreshToken: tokens.refresh_token
          ? encryptToken(tokens.refresh_token)
          : null,
        tokenExpiresAt,
        dropboxAccountId: accountInfo.accountId,
        dropboxEmail: accountInfo.email,
        dropboxDisplayName: accountInfo.displayName,
        isActive: true,
        lastVerifiedAt: new Date(),
      })
      .returning();

    return {
      ...connection,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
    };
  } catch (error) {
    console.error("Error saving Dropbox connection:", error);
    throw new Error("Failed to save Dropbox connection");
  }
}

/**
 * Update tokens after refresh
 */
export async function updateDropboxTokens(
  userId: string,
  tokens: DropboxTokens
): Promise<void> {
  try {
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    await db
      .update(dropboxConnectionsTable)
      .set({
        accessToken: encryptToken(tokens.access_token),
        tokenExpiresAt,
        lastVerifiedAt: new Date(),
      })
      .where(eq(dropboxConnectionsTable.userId, userId));
  } catch (error) {
    console.error("Error updating Dropbox tokens:", error);
    throw new Error("Failed to update Dropbox tokens");
  }
}

/**
 * Disconnect Dropbox account
 */
export async function disconnectDropbox(userId: string): Promise<boolean> {
  try {
    // Get the connection first to revoke the token
    const connection = await getDropboxConnection(userId);

    if (!connection) {
      return false;
    }

    // Revoke the token with Dropbox
    await revokeDropboxToken(connection.accessToken);

    // Mark connection as inactive (soft delete)
    await db
      .update(dropboxConnectionsTable)
      .set({
        isActive: false,
        accessToken: encryptToken("revoked"),
        refreshToken: null,
      })
      .where(eq(dropboxConnectionsTable.userId, userId));

    return true;
  } catch (error) {
    console.error("Error disconnecting Dropbox:", error);
    throw new Error("Failed to disconnect Dropbox");
  }
}

/**
 * Check if user has an active Dropbox connection
 */
export async function hasDropboxConnection(userId: string): Promise<boolean> {
  try {
    const [connection] = await db
      .select({ id: dropboxConnectionsTable.id })
      .from(dropboxConnectionsTable)
      .where(
        and(
          eq(dropboxConnectionsTable.userId, userId),
          eq(dropboxConnectionsTable.isActive, true)
        )
      )
      .limit(1);

    return !!connection;
  } catch (error) {
    console.error("Error checking Dropbox connection:", error);
    return false;
  }
}

/**
 * Get Dropbox connection status for display
 */
export async function getDropboxConnectionStatus(
  userId: string
): Promise<{
  connected: boolean;
  accountEmail: string | null;
  accountName: string | null;
  lastVerified: Date | null;
} | null> {
  try {
    const connection = await getDropboxConnection(userId);

    if (!connection) {
      return {
        connected: false,
        accountEmail: null,
        accountName: null,
        lastVerified: null,
      };
    }

    return {
      connected: true,
      accountEmail: connection.dropboxEmail,
      accountName: connection.dropboxDisplayName,
      lastVerified: connection.lastVerifiedAt,
    };
  } catch (error) {
    console.error("Error getting Dropbox status:", error);
    return null;
  }
}

/**
 * Check if token is expired and needs refresh
 */
export function isTokenExpired(connection: DropboxConnection): boolean {
  if (!connection.tokenExpiresAt) {
    return false; // No expiration set, assume valid
  }

  // Consider expired if less than 5 minutes remaining
  const bufferMs = 5 * 60 * 1000;
  return connection.tokenExpiresAt.getTime() - bufferMs < Date.now();
}
