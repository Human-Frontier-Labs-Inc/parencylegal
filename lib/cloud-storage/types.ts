/**
 * Cloud Storage Provider Types
 * Shared type definitions for all cloud storage providers
 */

// Supported provider types
export type CloudStorageProviderType = 'dropbox' | 'onedrive';

// Connection status
export interface CloudStorageConnectionStatus {
  connected: boolean;
  provider: CloudStorageProviderType;
  accountEmail: string | null;
  accountName: string | null;
  lastVerifiedAt: Date | null;
  needsReauth: boolean;
}

// Normalized connection data
export interface CloudStorageConnection {
  id: string;
  userId: string;
  provider: CloudStorageProviderType;
  providerAccountId: string;
  providerEmail: string | null;
  providerDisplayName: string | null;
  isActive: boolean;
  tokenExpiresAt: Date | null;
  lastVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Normalized folder structure
export interface CloudStorageFolder {
  id: string;
  name: string;
  path: string;
  pathDisplay: string;
  provider: CloudStorageProviderType;
}

// Normalized file structure
export interface CloudStorageFile {
  id: string;
  name: string;
  path: string;
  pathDisplay: string;
  size: number;
  mimeType: string | null;
  modifiedAt: Date;
  provider: CloudStorageProviderType;
  downloadable: boolean;
  contentHash?: string;
}

// Folder contents response
export interface CloudStorageFolderContents {
  folders: CloudStorageFolder[];
  files: CloudStorageFile[];
  hasMore: boolean;
  cursor?: string;
}

// OAuth tokens (provider-agnostic)
export interface CloudStorageTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  accountId: string;
}

// Account info (provider-agnostic)
export interface CloudStorageAccountInfo {
  accountId: string;
  email: string;
  displayName: string;
}

// Provider configuration
export interface CloudStorageProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

// Error types
export class CloudStorageError extends Error {
  constructor(
    message: string,
    public code: CloudStorageErrorCode,
    public provider: CloudStorageProviderType,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'CloudStorageError';
  }
}

export type CloudStorageErrorCode =
  | 'NOT_CONNECTED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_REFRESH_FAILED'
  | 'FOLDER_NOT_FOUND'
  | 'FILE_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'INVALID_PATH'
  | 'PROVIDER_ERROR';
