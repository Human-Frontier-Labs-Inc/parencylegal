/**
 * Dropbox Provider Implementation
 * Implements CloudStorageProvider interface for Dropbox
 */

import { CloudStorageProvider } from '../../provider-interface';
import {
  CloudStorageProviderType,
  CloudStorageTokens,
  CloudStorageAccountInfo,
  CloudStorageFolderContents,
  CloudStorageFolder,
  CloudStorageFile,
  CloudStorageError,
} from '../../types';

// Environment configuration
const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY || '';
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET || '';

export class DropboxProvider extends CloudStorageProvider {
  readonly providerType: CloudStorageProviderType = 'dropbox';
  readonly displayName = 'Dropbox';

  // ============================================
  // OAuth & Connection Management
  // ============================================

  getAuthUrl(userId: string, redirectUri: string): string {
    if (!DROPBOX_APP_KEY) {
      throw new CloudStorageError(
        'DROPBOX_APP_KEY is not configured',
        'PROVIDER_ERROR',
        'dropbox'
      );
    }

    const state = this.generateStateData(userId);

    const params = new URLSearchParams({
      client_id: DROPBOX_APP_KEY,
      redirect_uri: redirectUri,
      response_type: 'code',
      token_access_type: 'offline',
      state: state,
    });

    return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<CloudStorageTokens> {
    if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
      throw new CloudStorageError(
        'Dropbox credentials not configured',
        'PROVIDER_ERROR',
        'dropbox'
      );
    }

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: DROPBOX_APP_KEY,
        client_secret: DROPBOX_APP_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dropbox token exchange failed:', response.status, errorText);

      if (response.status === 400) {
        throw new CloudStorageError('Invalid authorization code', 'PROVIDER_ERROR', 'dropbox');
      }
      if (response.status === 429) {
        throw new CloudStorageError('Rate limited', 'RATE_LIMITED', 'dropbox');
      }
      throw new CloudStorageError('Token exchange failed', 'PROVIDER_ERROR', 'dropbox');
    }

    const result = await response.json();

    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresIn: result.expires_in,
      tokenType: result.token_type,
      accountId: result.account_id,
    };
  }

  async refreshToken(refreshToken: string): Promise<CloudStorageTokens> {
    if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
      throw new CloudStorageError(
        'Dropbox credentials not configured',
        'PROVIDER_ERROR',
        'dropbox'
      );
    }

    if (!refreshToken) {
      throw new CloudStorageError(
        'No refresh token available',
        'TOKEN_REFRESH_FAILED',
        'dropbox'
      );
    }

    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: DROPBOX_APP_KEY,
        client_secret: DROPBOX_APP_SECRET,
      }),
    });

    if (!response.ok) {
      throw new CloudStorageError(
        'Failed to refresh Dropbox token',
        'TOKEN_REFRESH_FAILED',
        'dropbox'
      );
    }

    const result = await response.json();

    return {
      accessToken: result.access_token,
      refreshToken: refreshToken, // Dropbox doesn't return a new refresh token
      expiresIn: result.expires_in || 14400,
      tokenType: result.token_type || 'bearer',
      accountId: '', // Will be populated from existing connection
    };
  }

  async revokeToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.dropboxapi.com/2/auth/token/revoke', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.ok || response.status === 401;
    } catch {
      return true; // Token might already be invalid
    }
  }

  validateState(state: string): string | null {
    return this.validateStateData(state);
  }

  async getAccountInfo(accessToken: string): Promise<CloudStorageAccountInfo> {
    const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: 'null',
    });

    if (!response.ok) {
      throw new CloudStorageError(
        'Failed to get Dropbox account info',
        'PROVIDER_ERROR',
        'dropbox'
      );
    }

    const result = await response.json();

    return {
      accountId: result.account_id,
      email: result.email,
      displayName: result.name.display_name,
    };
  }

  async verifyConnection(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: 'null',
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  // ============================================
  // Folder Operations
  // ============================================

  async listFolders(
    accessToken: string,
    path: string,
    cursor?: string
  ): Promise<CloudStorageFolderContents> {
    let response;

    if (cursor) {
      response = await fetch('https://api.dropboxapi.com/2/files/list_folder/continue', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cursor }),
      });
    } else {
      const listPath = this.normalizePath(path);
      response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: listPath,
          recursive: false,
          include_mounted_folders: true,
          include_non_downloadable_files: false,
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error listing Dropbox folders:', response.status, errorText);

      if (response.status === 409) {
        throw new CloudStorageError('Folder not found', 'FOLDER_NOT_FOUND', 'dropbox');
      }
      if (response.status === 401) {
        throw new CloudStorageError('Token expired', 'TOKEN_EXPIRED', 'dropbox');
      }
      if (response.status === 429) {
        throw new CloudStorageError('Rate limited', 'RATE_LIMITED', 'dropbox');
      }
      throw new CloudStorageError('Failed to list folders', 'PROVIDER_ERROR', 'dropbox');
    }

    const result = await response.json();

    const folders: CloudStorageFolder[] = [];
    const files: CloudStorageFile[] = [];

    for (const entry of result.entries) {
      if (entry['.tag'] === 'folder') {
        folders.push({
          id: entry.id || '',
          name: entry.name,
          path: entry.path_lower || '',
          pathDisplay: entry.path_display || entry.name,
          provider: 'dropbox',
        });
      } else if (entry['.tag'] === 'file') {
        files.push({
          id: entry.id,
          name: entry.name,
          path: entry.path_lower || '',
          pathDisplay: entry.path_display || entry.name,
          size: entry.size,
          mimeType: this.getMimeType(entry.name),
          modifiedAt: new Date(entry.server_modified),
          provider: 'dropbox',
          downloadable: entry.is_downloadable !== false,
          contentHash: entry.content_hash,
        });
      }
    }

    return {
      folders,
      files,
      hasMore: result.has_more,
      cursor: result.cursor,
    };
  }

  async searchFolders(
    accessToken: string,
    query: string,
    maxResults: number = 20
  ): Promise<CloudStorageFolder[]> {
    const response = await fetch('https://api.dropboxapi.com/2/files/search_v2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        options: {
          path: '',
          max_results: maxResults,
          file_status: 'active',
          filename_only: false,
        },
      }),
    });

    if (!response.ok) {
      throw new CloudStorageError('Failed to search folders', 'PROVIDER_ERROR', 'dropbox');
    }

    const result = await response.json();
    const folders: CloudStorageFolder[] = [];

    for (const match of result.matches) {
      if (match.metadata['.tag'] === 'metadata') {
        const metadata = match.metadata.metadata;
        if (metadata['.tag'] === 'folder') {
          folders.push({
            id: metadata.id || '',
            name: metadata.name,
            path: metadata.path_lower || '',
            pathDisplay: metadata.path_display || metadata.name,
            provider: 'dropbox',
          });
        }
      }
    }

    return folders;
  }

  async getFolderMetadata(accessToken: string, pathOrId: string): Promise<CloudStorageFolder> {
    const response = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: pathOrId }),
    });

    if (!response.ok) {
      if (response.status === 409) {
        throw new CloudStorageError('Folder not found', 'FOLDER_NOT_FOUND', 'dropbox');
      }
      throw new CloudStorageError('Failed to get folder metadata', 'PROVIDER_ERROR', 'dropbox');
    }

    const entry = await response.json();

    if (entry['.tag'] !== 'folder') {
      throw new CloudStorageError('Path is not a folder', 'INVALID_PATH', 'dropbox');
    }

    return {
      id: entry.id || '',
      name: entry.name,
      path: entry.path_lower || '',
      pathDisplay: entry.path_display || entry.name,
      provider: 'dropbox',
    };
  }

  // ============================================
  // File Operations
  // ============================================

  async getFileMetadata(accessToken: string, pathOrId: string): Promise<CloudStorageFile> {
    const response = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: pathOrId }),
    });

    if (!response.ok) {
      if (response.status === 409) {
        throw new CloudStorageError('File not found', 'FILE_NOT_FOUND', 'dropbox');
      }
      throw new CloudStorageError('Failed to get file metadata', 'PROVIDER_ERROR', 'dropbox');
    }

    const entry = await response.json();

    if (entry['.tag'] !== 'file') {
      throw new CloudStorageError('Path is not a file', 'INVALID_PATH', 'dropbox');
    }

    return {
      id: entry.id,
      name: entry.name,
      path: entry.path_lower || '',
      pathDisplay: entry.path_display || entry.name,
      size: entry.size,
      mimeType: this.getMimeType(entry.name),
      modifiedAt: new Date(entry.server_modified),
      provider: 'dropbox',
      downloadable: entry.is_downloadable !== false,
      contentHash: entry.content_hash,
    };
  }

  async downloadFile(accessToken: string, pathOrId: string): Promise<Buffer> {
    const response = await fetch('https://content.dropboxapi.com/2/files/download', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Dropbox-API-Arg': JSON.stringify({ path: pathOrId }),
      },
    });

    if (!response.ok) {
      if (response.status === 409) {
        throw new CloudStorageError('File not found', 'FILE_NOT_FOUND', 'dropbox');
      }
      throw new CloudStorageError('Failed to download file', 'PROVIDER_ERROR', 'dropbox');
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async getDownloadUrl(accessToken: string, pathOrId: string): Promise<string> {
    const response = await fetch('https://api.dropboxapi.com/2/files/get_temporary_link', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: pathOrId }),
    });

    if (!response.ok) {
      if (response.status === 409) {
        throw new CloudStorageError('File not found', 'FILE_NOT_FOUND', 'dropbox');
      }
      throw new CloudStorageError('Failed to get download URL', 'PROVIDER_ERROR', 'dropbox');
    }

    const result = await response.json();
    return result.link;
  }
}
