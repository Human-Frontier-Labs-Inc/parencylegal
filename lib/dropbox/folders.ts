/**
 * Dropbox Folder Operations
 * Handles folder browsing, search, and metadata retrieval
 * Using direct fetch API instead of SDK for serverless compatibility
 */

import { Dropbox } from 'dropbox';
import { getDropboxConnection, isTokenExpired, updateDropboxTokens } from '@/db/queries/dropbox-queries';
import { refreshDropboxToken } from './oauth';

// Types
export interface DropboxFolder {
  id: string;
  name: string;
  path: string;
  pathDisplay: string;
}

export interface DropboxFile {
  id: string;
  name: string;
  path: string;
  pathDisplay: string;
  size: number;
  serverModified: Date;
  contentHash?: string;
  isDownloadable: boolean;
}

export interface FolderContents {
  folders: DropboxFolder[];
  files: DropboxFile[];
  hasMore: boolean;
  cursor?: string;
}

/**
 * Get a valid access token for a user
 * Handles token refresh if needed
 */
export async function getAccessTokenForUser(userId: string): Promise<string> {
  const connection = await getDropboxConnection(userId);

  if (!connection) {
    throw new Error('No Dropbox connection');
  }

  // Check if token needs refresh
  if (isTokenExpired(connection)) {
    if (!connection.refreshToken) {
      throw new Error('Dropbox connection invalid - no refresh token');
    }

    try {
      const newTokens = await refreshDropboxToken(connection.refreshToken);
      newTokens.account_id = connection.dropboxAccountId;
      await updateDropboxTokens(userId, newTokens);
      return newTokens.access_token;
    } catch (error) {
      throw new Error('Dropbox connection invalid - token refresh failed');
    }
  }

  return connection.accessToken;
}

/**
 * List folders and files at a specific path
 */
export async function listDropboxFolders(
  userId: string,
  path: string = '',
  cursor?: string
): Promise<FolderContents> {
  const accessToken = await getAccessTokenForUser(userId);

  try {
    let response;

    if (cursor) {
      // Continue from previous cursor
      response = await fetch('https://api.dropboxapi.com/2/files/list_folder/continue', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cursor }),
      });
    } else {
      // Start fresh listing
      const listPath = path === '/' ? '' : path;
      response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
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
        throw new Error('Folder not found');
      }
      if (response.status === 401) {
        throw new Error('Dropbox connection invalid');
      }
      if (response.status === 429) {
        throw new Error('Rate limited - please try again later');
      }
      throw new Error('Failed to list Dropbox folders');
    }

    const result = await response.json();

    const folders: DropboxFolder[] = [];
    const files: DropboxFile[] = [];

    for (const entry of result.entries) {
      if (entry['.tag'] === 'folder') {
        folders.push({
          id: entry.id || '',
          name: entry.name,
          path: entry.path_lower || '',
          pathDisplay: entry.path_display || entry.name,
        });
      } else if (entry['.tag'] === 'file') {
        files.push({
          id: entry.id,
          name: entry.name,
          path: entry.path_lower || '',
          pathDisplay: entry.path_display || entry.name,
          size: entry.size,
          serverModified: new Date(entry.server_modified),
          contentHash: entry.content_hash,
          isDownloadable: entry.is_downloadable !== false,
        });
      }
    }

    return {
      folders,
      files,
      hasMore: result.has_more,
      cursor: result.cursor,
    };
  } catch (error: any) {
    console.error('Error listing Dropbox folders:', error);
    throw error;
  }
}

/**
 * Get metadata for a specific folder
 */
export async function getDropboxFolderMetadata(
  userId: string,
  pathOrId: string
): Promise<DropboxFolder> {
  const accessToken = await getAccessTokenForUser(userId);

  try {
    const response = await fetch('https://api.dropboxapi.com/2/files/get_metadata', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: pathOrId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error getting folder metadata:', response.status, errorText);

      if (response.status === 409) {
        throw new Error('Folder not found');
      }
      throw new Error('Failed to get folder metadata');
    }

    const entry = await response.json();

    if (entry['.tag'] !== 'folder') {
      throw new Error('Path is not a folder');
    }

    return {
      id: entry.id || '',
      name: entry.name,
      path: entry.path_lower || '',
      pathDisplay: entry.path_display || entry.name,
    };
  } catch (error: any) {
    console.error('Error getting folder metadata:', error);
    throw error;
  }
}

/**
 * Search for folders by query
 */
export async function searchDropboxFolders(
  userId: string,
  query: string,
  maxResults: number = 20
): Promise<DropboxFolder[]> {
  const accessToken = await getAccessTokenForUser(userId);

  try {
    const response = await fetch('https://api.dropboxapi.com/2/files/search_v2', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
      const errorText = await response.text();
      console.error('Error searching Dropbox folders:', response.status, errorText);
      throw new Error('Failed to search Dropbox folders');
    }

    const result = await response.json();
    const folders: DropboxFolder[] = [];

    for (const match of result.matches) {
      if (match.metadata['.tag'] === 'metadata') {
        const metadata = match.metadata.metadata;
        if (metadata['.tag'] === 'folder') {
          folders.push({
            id: metadata.id || '',
            name: metadata.name,
            path: metadata.path_lower || '',
            pathDisplay: metadata.path_display || metadata.name,
          });
        }
      }
    }

    return folders;
  } catch (error: any) {
    console.error('Error searching Dropbox folders:', error);
    throw new Error('Failed to search Dropbox folders');
  }
}

/**
 * Validate that user has access to a folder
 */
export async function validateFolderAccess(
  userId: string,
  folderPath: string
): Promise<boolean> {
  try {
    await getDropboxFolderMetadata(userId, folderPath);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get file count and total size for a folder
 */
export async function getFolderStats(
  userId: string,
  folderPath: string
): Promise<{ fileCount: number; totalSize: number }> {
  let fileCount = 0;
  let totalSize = 0;
  let cursor: string | undefined;

  do {
    const contents = await listDropboxFolders(userId, folderPath, cursor);

    for (const file of contents.files) {
      fileCount++;
      totalSize += file.size;
    }

    cursor = contents.hasMore ? contents.cursor : undefined;
  } while (cursor);

  return { fileCount, totalSize };
}

/**
 * Get an authenticated Dropbox client instance for a user
 * @deprecated Use getAccessTokenForUser() with direct fetch API instead for serverless compatibility
 * The Dropbox SDK has issues with `this.fetch` in Vercel serverless
 */
export async function getDropboxClientForUser(userId: string): Promise<Dropbox> {
  console.warn('getDropboxClientForUser is deprecated - use getAccessTokenForUser with fetch API');
  const accessToken = await getAccessTokenForUser(userId);
  return new Dropbox({ accessToken });
}
