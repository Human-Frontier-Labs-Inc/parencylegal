/**
 * Cloud Storage Provider Interface
 * Abstract interface that all providers must implement
 */

import {
  CloudStorageProviderType,
  CloudStorageConnectionStatus,
  CloudStorageTokens,
  CloudStorageAccountInfo,
  CloudStorageFolderContents,
  CloudStorageFolder,
  CloudStorageFile,
} from './types';

/**
 * Abstract base class for cloud storage providers
 * All providers (Dropbox, OneDrive, Google Drive) must extend this class
 */
export abstract class CloudStorageProvider {
  abstract readonly providerType: CloudStorageProviderType;
  abstract readonly displayName: string;

  // ============================================
  // OAuth & Connection Management
  // ============================================

  /**
   * Generate OAuth authorization URL
   * @param userId - Internal user ID for state validation
   * @param redirectUri - OAuth callback URL
   * @returns Authorization URL to redirect user to
   */
  abstract getAuthUrl(userId: string, redirectUri: string): string;

  /**
   * Exchange authorization code for tokens
   * @param code - Authorization code from OAuth callback
   * @param redirectUri - Must match the one used in getAuthUrl
   * @returns OAuth tokens
   */
  abstract exchangeCode(code: string, redirectUri: string): Promise<CloudStorageTokens>;

  /**
   * Refresh expired access token
   * @param refreshToken - Refresh token from initial auth
   * @returns New OAuth tokens
   */
  abstract refreshToken(refreshToken: string): Promise<CloudStorageTokens>;

  /**
   * Revoke access (disconnect)
   * @param accessToken - Current access token to revoke
   * @returns True if successfully revoked
   */
  abstract revokeToken(accessToken: string): Promise<boolean>;

  /**
   * Validate state parameter from OAuth callback
   * @param state - State parameter from callback
   * @returns User ID if valid, null otherwise
   */
  abstract validateState(state: string): string | null;

  /**
   * Get account info for connected account
   * @param accessToken - Valid access token
   * @returns Account information
   */
  abstract getAccountInfo(accessToken: string): Promise<CloudStorageAccountInfo>;

  /**
   * Verify if a connection/token is still valid
   * @param accessToken - Access token to verify
   * @returns True if connection is valid
   */
  abstract verifyConnection(accessToken: string): Promise<boolean>;

  // ============================================
  // Folder Operations
  // ============================================

  /**
   * List contents of a folder
   * @param accessToken - Valid access token
   * @param path - Folder path (empty string or "/" for root)
   * @param cursor - Pagination cursor for continued listing
   * @returns Folder contents with files and subfolders
   */
  abstract listFolders(
    accessToken: string,
    path: string,
    cursor?: string
  ): Promise<CloudStorageFolderContents>;

  /**
   * Search for folders by name
   * @param accessToken - Valid access token
   * @param query - Search query
   * @param maxResults - Maximum results to return
   * @returns Matching folders
   */
  abstract searchFolders(
    accessToken: string,
    query: string,
    maxResults?: number
  ): Promise<CloudStorageFolder[]>;

  /**
   * Get metadata for a specific folder
   * @param accessToken - Valid access token
   * @param pathOrId - Folder path or ID
   * @returns Folder metadata
   */
  abstract getFolderMetadata(
    accessToken: string,
    pathOrId: string
  ): Promise<CloudStorageFolder>;

  // ============================================
  // File Operations
  // ============================================

  /**
   * Get metadata for a specific file
   * @param accessToken - Valid access token
   * @param pathOrId - File path or ID
   * @returns File metadata
   */
  abstract getFileMetadata(
    accessToken: string,
    pathOrId: string
  ): Promise<CloudStorageFile>;

  /**
   * Download file content
   * @param accessToken - Valid access token
   * @param pathOrId - File path or ID
   * @returns File content as Buffer
   */
  abstract downloadFile(
    accessToken: string,
    pathOrId: string
  ): Promise<Buffer>;

  /**
   * Get a temporary download URL for a file
   * @param accessToken - Valid access token
   * @param pathOrId - File path or ID
   * @returns Temporary download URL
   */
  abstract getDownloadUrl(
    accessToken: string,
    pathOrId: string
  ): Promise<string>;

  // ============================================
  // Helper Methods (shared implementations)
  // ============================================

  /**
   * Generate state data for OAuth flow (CSRF protection)
   * Contains userId encoded with timestamp
   */
  protected generateStateData(userId: string): string {
    const timestamp = Date.now();
    const data = JSON.stringify({ userId, timestamp, provider: this.providerType });
    return Buffer.from(data).toString('base64url');
  }

  /**
   * Validate and decode state parameter
   * Returns userId if valid and not expired (10 minute window)
   */
  protected validateStateData(state: string): string | null {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      const data = JSON.parse(decoded);

      // Check provider matches
      if (data.provider !== this.providerType) {
        return null;
      }

      // Check if state is expired (10 minutes)
      const expirationMs = 10 * 60 * 1000;
      if (Date.now() - data.timestamp > expirationMs) {
        return null;
      }

      return data.userId || null;
    } catch {
      return null;
    }
  }

  /**
   * Normalize path for provider
   * Ensures consistent path format across providers
   */
  protected normalizePath(path: string): string {
    if (!path || path === '/') return '';
    return path.startsWith('/') ? path : `/${path}`;
  }

  /**
   * Get MIME type from file extension
   */
  protected getMimeType(filename: string): string | null {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      csv: 'text/csv',
      json: 'application/json',
      xml: 'application/xml',
      html: 'text/html',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      svg: 'image/svg+xml',
      mp3: 'audio/mpeg',
      mp4: 'video/mp4',
      zip: 'application/zip',
    };
    return ext ? mimeTypes[ext] || null : null;
  }
}
