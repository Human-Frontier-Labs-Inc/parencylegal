/**
 * Dropbox Folder Operations
 * Handles folder browsing, search, and metadata retrieval
 */

import { Dropbox, files } from 'dropbox';
import { getDropboxConnection, isTokenExpired, updateDropboxTokens } from '@/db/queries/dropbox-queries';
import { refreshDropboxToken, createDropboxClient } from './oauth';

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
 * Get an authenticated Dropbox client for a user
 * Handles token refresh if needed
 */
export async function getDropboxClientForUser(userId: string): Promise<Dropbox> {
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
      return createDropboxClient(newTokens.access_token);
    } catch (error) {
      throw new Error('Dropbox connection invalid - token refresh failed');
    }
  }

  return createDropboxClient(connection.accessToken);
}

/**
 * List folders and files at a specific path
 */
export async function listDropboxFolders(
  userId: string,
  path: string = '',
  cursor?: string
): Promise<FolderContents> {
  const dbx = await getDropboxClientForUser(userId);

  try {
    let response: files.ListFolderResult;

    if (cursor) {
      // Continue from previous cursor
      response = (await dbx.filesListFolderContinue({ cursor })).result;
    } else {
      // Start fresh listing
      const listPath = path === '/' ? '' : path;
      response = (await dbx.filesListFolder({
        path: listPath,
        recursive: false,
        include_mounted_folders: true,
        include_non_downloadable_files: false,
      })).result;
    }

    const folders: DropboxFolder[] = [];
    const files: DropboxFile[] = [];

    for (const entry of response.entries) {
      if (entry['.tag'] === 'folder') {
        folders.push({
          id: entry.id || '',
          name: entry.name,
          path: entry.path_lower || '',
          pathDisplay: entry.path_display || entry.name,
        });
      } else if (entry['.tag'] === 'file') {
        const fileEntry = entry as files.FileMetadata;
        files.push({
          id: fileEntry.id,
          name: fileEntry.name,
          path: fileEntry.path_lower || '',
          pathDisplay: fileEntry.path_display || fileEntry.name,
          size: fileEntry.size,
          serverModified: new Date(fileEntry.server_modified),
          contentHash: fileEntry.content_hash,
          isDownloadable: fileEntry.is_downloadable !== false,
        });
      }
    }

    return {
      folders,
      files,
      hasMore: response.has_more,
      cursor: response.cursor,
    };
  } catch (error: any) {
    console.error('Error listing Dropbox folders:', error);

    if (error.status === 409) {
      // Path not found
      throw new Error('Folder not found');
    }
    if (error.status === 401) {
      throw new Error('Dropbox connection invalid');
    }
    if (error.status === 429) {
      throw new Error('Rate limited - please try again later');
    }

    throw new Error('Failed to list Dropbox folders');
  }
}

/**
 * Get metadata for a specific folder
 */
export async function getDropboxFolderMetadata(
  userId: string,
  pathOrId: string
): Promise<DropboxFolder> {
  const dbx = await getDropboxClientForUser(userId);

  try {
    const response = await dbx.filesGetMetadata({
      path: pathOrId,
    });

    const entry = response.result;

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

    if (error.status === 409) {
      throw new Error('Folder not found');
    }

    throw new Error('Failed to get folder metadata');
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
  const dbx = await getDropboxClientForUser(userId);

  try {
    const response = await dbx.filesSearchV2({
      query,
      options: {
        path: '',
        max_results: maxResults,
        file_status: 'active',
        filename_only: false,
      },
    });

    const folders: DropboxFolder[] = [];

    for (const match of response.result.matches) {
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

    // Recursively count subfolders (optional, can be expensive)
    // for (const folder of contents.folders) {
    //   const subStats = await getFolderStats(userId, folder.path);
    //   fileCount += subStats.fileCount;
    //   totalSize += subStats.totalSize;
    // }

    cursor = contents.hasMore ? contents.cursor : undefined;
  } while (cursor);

  return { fileCount, totalSize };
}
