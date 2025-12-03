/**
 * OneDrive Provider Implementation
 * Implements CloudStorageProvider interface for Microsoft OneDrive
 * Uses Microsoft Graph API
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
const ONEDRIVE_CLIENT_ID = process.env.ONEDRIVE_CLIENT_ID || '';
const ONEDRIVE_CLIENT_SECRET = process.env.ONEDRIVE_CLIENT_SECRET || '';
const ONEDRIVE_TENANT_ID = process.env.ONEDRIVE_TENANT_ID || 'common';

// Microsoft Graph API base URL
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

// OAuth scopes for OneDrive access
const SCOPES = ['Files.Read', 'Files.Read.All', 'User.Read', 'offline_access'];

export class OneDriveProvider extends CloudStorageProvider {
  readonly providerType: CloudStorageProviderType = 'onedrive';
  readonly displayName = 'OneDrive';

  // ============================================
  // OAuth & Connection Management
  // ============================================

  getAuthUrl(userId: string, redirectUri: string): string {
    if (!ONEDRIVE_CLIENT_ID) {
      throw new CloudStorageError(
        'ONEDRIVE_CLIENT_ID is not configured',
        'PROVIDER_ERROR',
        'onedrive'
      );
    }

    const state = this.generateStateData(userId);

    const params = new URLSearchParams({
      client_id: ONEDRIVE_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES.join(' '),
      state: state,
      response_mode: 'query',
    });

    return `https://login.microsoftonline.com/${ONEDRIVE_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<CloudStorageTokens> {
    if (!ONEDRIVE_CLIENT_ID || !ONEDRIVE_CLIENT_SECRET) {
      throw new CloudStorageError(
        'OneDrive credentials not configured',
        'PROVIDER_ERROR',
        'onedrive'
      );
    }

    const response = await fetch(
      `https://login.microsoftonline.com/${ONEDRIVE_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: ONEDRIVE_CLIENT_ID,
          client_secret: ONEDRIVE_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          scope: SCOPES.join(' '),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OneDrive token exchange failed:', response.status, errorText);

      if (response.status === 400) {
        throw new CloudStorageError('Invalid authorization code', 'PROVIDER_ERROR', 'onedrive');
      }
      if (response.status === 429) {
        throw new CloudStorageError('Rate limited', 'RATE_LIMITED', 'onedrive');
      }
      throw new CloudStorageError('Token exchange failed', 'PROVIDER_ERROR', 'onedrive');
    }

    const result = await response.json();

    // Get account info to retrieve account ID
    const accountInfo = await this.getAccountInfo(result.access_token);

    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      expiresIn: result.expires_in,
      tokenType: result.token_type,
      accountId: accountInfo.accountId,
    };
  }

  async refreshToken(refreshToken: string): Promise<CloudStorageTokens> {
    if (!ONEDRIVE_CLIENT_ID || !ONEDRIVE_CLIENT_SECRET) {
      throw new CloudStorageError(
        'OneDrive credentials not configured',
        'PROVIDER_ERROR',
        'onedrive'
      );
    }

    if (!refreshToken) {
      throw new CloudStorageError(
        'No refresh token available',
        'TOKEN_REFRESH_FAILED',
        'onedrive'
      );
    }

    const response = await fetch(
      `https://login.microsoftonline.com/${ONEDRIVE_TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: ONEDRIVE_CLIENT_ID,
          client_secret: ONEDRIVE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: SCOPES.join(' '),
        }),
      }
    );

    if (!response.ok) {
      throw new CloudStorageError(
        'Failed to refresh OneDrive token',
        'TOKEN_REFRESH_FAILED',
        'onedrive'
      );
    }

    const result = await response.json();

    return {
      accessToken: result.access_token,
      refreshToken: result.refresh_token || refreshToken, // Microsoft may return a new refresh token
      expiresIn: result.expires_in,
      tokenType: result.token_type,
      accountId: '', // Will be populated from existing connection
    };
  }

  async revokeToken(accessToken: string): Promise<boolean> {
    // Microsoft doesn't have a direct token revocation endpoint
    // The token will expire naturally, but we can sign out the user
    // For now, just return true as we'll mark the connection as inactive
    return true;
  }

  validateState(state: string): string | null {
    return this.validateStateData(state);
  }

  async getAccountInfo(accessToken: string): Promise<CloudStorageAccountInfo> {
    const response = await fetch(`${GRAPH_API_BASE}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new CloudStorageError(
        'Failed to get OneDrive account info',
        'PROVIDER_ERROR',
        'onedrive'
      );
    }

    const result = await response.json();

    return {
      accountId: result.id,
      email: result.mail || result.userPrincipalName,
      displayName: result.displayName,
    };
  }

  async verifyConnection(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${GRAPH_API_BASE}/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
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
    let url: string;

    if (cursor) {
      // Use the nextLink URL for pagination
      url = cursor;
    } else {
      // Build URL based on path
      if (!path || path === '/' || path === '') {
        url = `${GRAPH_API_BASE}/me/drive/root/children`;
      } else {
        // Encode the path properly for OneDrive
        const encodedPath = encodeURIComponent(path.startsWith('/') ? path : `/${path}`);
        url = `${GRAPH_API_BASE}/me/drive/root:${encodedPath}:/children`;
      }
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error listing OneDrive folders:', response.status, errorText);

      if (response.status === 404) {
        throw new CloudStorageError('Folder not found', 'FOLDER_NOT_FOUND', 'onedrive');
      }
      if (response.status === 401) {
        throw new CloudStorageError('Token expired', 'TOKEN_EXPIRED', 'onedrive');
      }
      if (response.status === 429) {
        throw new CloudStorageError('Rate limited', 'RATE_LIMITED', 'onedrive');
      }
      throw new CloudStorageError('Failed to list folders', 'PROVIDER_ERROR', 'onedrive');
    }

    const result = await response.json();

    const folders: CloudStorageFolder[] = [];
    const files: CloudStorageFile[] = [];

    for (const item of result.value || []) {
      if (item.folder) {
        folders.push({
          id: item.id,
          name: item.name,
          path: item.parentReference?.path
            ? `${item.parentReference.path.replace('/drive/root:', '')}/${item.name}`
            : `/${item.name}`,
          pathDisplay: item.name,
          provider: 'onedrive',
        });
      } else if (item.file) {
        files.push({
          id: item.id,
          name: item.name,
          path: item.parentReference?.path
            ? `${item.parentReference.path.replace('/drive/root:', '')}/${item.name}`
            : `/${item.name}`,
          pathDisplay: item.name,
          size: item.size,
          mimeType: item.file.mimeType || this.getMimeType(item.name),
          modifiedAt: new Date(item.lastModifiedDateTime),
          provider: 'onedrive',
          downloadable: true,
          contentHash: item.file.hashes?.sha256Hash,
        });
      }
    }

    return {
      folders,
      files,
      hasMore: !!result['@odata.nextLink'],
      cursor: result['@odata.nextLink'],
    };
  }

  async searchFolders(
    accessToken: string,
    query: string,
    maxResults: number = 20
  ): Promise<CloudStorageFolder[]> {
    const response = await fetch(
      `${GRAPH_API_BASE}/me/drive/root/search(q='${encodeURIComponent(query)}')?$top=${maxResults}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new CloudStorageError('Failed to search folders', 'PROVIDER_ERROR', 'onedrive');
    }

    const result = await response.json();
    const folders: CloudStorageFolder[] = [];

    for (const item of result.value || []) {
      if (item.folder) {
        folders.push({
          id: item.id,
          name: item.name,
          path: item.parentReference?.path
            ? `${item.parentReference.path.replace('/drive/root:', '')}/${item.name}`
            : `/${item.name}`,
          pathDisplay: item.name,
          provider: 'onedrive',
        });
      }
    }

    return folders;
  }

  async getFolderMetadata(accessToken: string, pathOrId: string): Promise<CloudStorageFolder> {
    let url: string;

    // Check if it's an ID (no slashes) or a path
    if (pathOrId.includes('/') || pathOrId.startsWith('/')) {
      const encodedPath = encodeURIComponent(pathOrId.startsWith('/') ? pathOrId : `/${pathOrId}`);
      url = `${GRAPH_API_BASE}/me/drive/root:${encodedPath}`;
    } else {
      url = `${GRAPH_API_BASE}/me/drive/items/${pathOrId}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new CloudStorageError('Folder not found', 'FOLDER_NOT_FOUND', 'onedrive');
      }
      throw new CloudStorageError('Failed to get folder metadata', 'PROVIDER_ERROR', 'onedrive');
    }

    const item = await response.json();

    if (!item.folder) {
      throw new CloudStorageError('Path is not a folder', 'INVALID_PATH', 'onedrive');
    }

    return {
      id: item.id,
      name: item.name,
      path: item.parentReference?.path
        ? `${item.parentReference.path.replace('/drive/root:', '')}/${item.name}`
        : `/${item.name}`,
      pathDisplay: item.name,
      provider: 'onedrive',
    };
  }

  // ============================================
  // File Operations
  // ============================================

  async getFileMetadata(accessToken: string, pathOrId: string): Promise<CloudStorageFile> {
    let url: string;

    if (pathOrId.includes('/') || pathOrId.startsWith('/')) {
      const encodedPath = encodeURIComponent(pathOrId.startsWith('/') ? pathOrId : `/${pathOrId}`);
      url = `${GRAPH_API_BASE}/me/drive/root:${encodedPath}`;
    } else {
      url = `${GRAPH_API_BASE}/me/drive/items/${pathOrId}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new CloudStorageError('File not found', 'FILE_NOT_FOUND', 'onedrive');
      }
      throw new CloudStorageError('Failed to get file metadata', 'PROVIDER_ERROR', 'onedrive');
    }

    const item = await response.json();

    if (!item.file) {
      throw new CloudStorageError('Path is not a file', 'INVALID_PATH', 'onedrive');
    }

    return {
      id: item.id,
      name: item.name,
      path: item.parentReference?.path
        ? `${item.parentReference.path.replace('/drive/root:', '')}/${item.name}`
        : `/${item.name}`,
      pathDisplay: item.name,
      size: item.size,
      mimeType: item.file.mimeType || this.getMimeType(item.name),
      modifiedAt: new Date(item.lastModifiedDateTime),
      provider: 'onedrive',
      downloadable: true,
      contentHash: item.file.hashes?.sha256Hash,
    };
  }

  async downloadFile(accessToken: string, pathOrId: string): Promise<Buffer> {
    let url: string;

    if (pathOrId.includes('/') || pathOrId.startsWith('/')) {
      const encodedPath = encodeURIComponent(pathOrId.startsWith('/') ? pathOrId : `/${pathOrId}`);
      url = `${GRAPH_API_BASE}/me/drive/root:${encodedPath}:/content`;
    } else {
      url = `${GRAPH_API_BASE}/me/drive/items/${pathOrId}/content`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new CloudStorageError('File not found', 'FILE_NOT_FOUND', 'onedrive');
      }
      throw new CloudStorageError('Failed to download file', 'PROVIDER_ERROR', 'onedrive');
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async getDownloadUrl(accessToken: string, pathOrId: string): Promise<string> {
    let url: string;

    if (pathOrId.includes('/') || pathOrId.startsWith('/')) {
      const encodedPath = encodeURIComponent(pathOrId.startsWith('/') ? pathOrId : `/${pathOrId}`);
      url = `${GRAPH_API_BASE}/me/drive/root:${encodedPath}`;
    } else {
      url = `${GRAPH_API_BASE}/me/drive/items/${pathOrId}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new CloudStorageError('File not found', 'FILE_NOT_FOUND', 'onedrive');
      }
      throw new CloudStorageError('Failed to get download URL', 'PROVIDER_ERROR', 'onedrive');
    }

    const item = await response.json();

    // OneDrive provides @microsoft.graph.downloadUrl for direct download
    if (item['@microsoft.graph.downloadUrl']) {
      return item['@microsoft.graph.downloadUrl'];
    }

    // Fallback to content endpoint
    if (pathOrId.includes('/') || pathOrId.startsWith('/')) {
      const encodedPath = encodeURIComponent(pathOrId.startsWith('/') ? pathOrId : `/${pathOrId}`);
      return `${GRAPH_API_BASE}/me/drive/root:${encodedPath}:/content`;
    }
    return `${GRAPH_API_BASE}/me/drive/items/${pathOrId}/content`;
  }
}
