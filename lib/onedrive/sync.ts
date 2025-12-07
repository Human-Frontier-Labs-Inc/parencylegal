/**
 * OneDrive File Sync Service
 * Handles file synchronization from OneDrive to Supabase Storage
 * Mirrors the Dropbox sync service structure
 */

import { db } from '@/db/db';
import { documentsTable, casesTable, syncHistoryTable } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getOnedriveConnection, isTokenExpired, updateOnedriveTokens } from '@/db/queries/onedrive-queries';
import { OneDriveProvider } from '@/lib/cloud-storage/providers/onedrive';
import { CloudStorageFile } from '@/lib/cloud-storage/types';
import { uploadDocument } from '@/lib/storage';
import { addToQueue } from '@/lib/queue/document-processing';

// Initialize OneDrive provider
const onedriveProvider = new OneDriveProvider();

// Types
export interface SyncResult {
  syncId: string;
  caseId: string;
  status: 'in_progress' | 'completed' | 'error';
  filesFound: number;
  filesNew: number;
  filesUpdated: number;
  filesSkipped: number;
  filesError: number;
  filesQueued: number;
  errors: Array<{ file: string; error: string; timestamp: string }>;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
}

export interface SyncProgress {
  syncId: string;
  status: 'in_progress' | 'completed' | 'error';
  progress: number;
  currentFile?: string;
  filesProcessed: number;
  totalFiles: number;
}

// In-memory store for active syncs
const activeSyncs = new Map<string, SyncProgress>();

/**
 * Get access token for user, refreshing if needed
 */
async function getAccessTokenForUser(userId: string): Promise<string> {
  const connection = await getOnedriveConnection(userId);

  if (!connection) {
    throw new Error('No OneDrive connection found');
  }

  if (!connection.isActive) {
    throw new Error('OneDrive connection is not active');
  }

  // Refresh token if expired
  if (isTokenExpired(connection)) {
    if (!connection.refreshToken) {
      throw new Error('OneDrive token expired and no refresh token available');
    }

    console.log('[OneDrive Sync] Token expired, refreshing...');
    const newTokens = await onedriveProvider.refreshToken(connection.refreshToken);
    await updateOnedriveTokens(userId, newTokens);
    return newTokens.accessToken;
  }

  return connection.accessToken;
}

/**
 * Get case with its OneDrive folder mapping
 */
async function getCaseWithFolder(caseId: string, userId: string) {
  const [caseRecord] = await db
    .select()
    .from(casesTable)
    .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)))
    .limit(1);

  return caseRecord;
}

/**
 * Start a sync operation
 */
async function startSync(
  caseId: string,
  userId: string
): Promise<SyncResult> {
  const caseRecord = await getCaseWithFolder(caseId, userId);

  if (!caseRecord) {
    throw new Error('Case not found');
  }

  const folderPath = caseRecord.cloudFolderPath || caseRecord.dropboxFolderPath;
  if (!folderPath) {
    throw new Error('No OneDrive folder mapped');
  }

  // Check for existing active sync
  const existingSync = activeSyncs.get(caseId);
  if (existingSync && existingSync.status === 'in_progress') {
    throw new Error('Sync already in progress');
  }

  // Create sync history record
  const [syncRecord] = await db
    .insert(syncHistoryTable)
    .values({
      caseId,
      userId,
      source: 'onedrive',
      status: 'in_progress',
      startedAt: new Date(),
    })
    .returning();

  // Initialize progress tracking
  activeSyncs.set(caseId, {
    syncId: syncRecord.id,
    status: 'in_progress',
    progress: 0,
    filesProcessed: 0,
    totalFiles: 0,
  });

  return {
    syncId: syncRecord.id,
    caseId,
    status: 'in_progress',
    filesFound: 0,
    filesNew: 0,
    filesUpdated: 0,
    filesSkipped: 0,
    filesError: 0,
    filesQueued: 0,
    errors: [],
    startedAt: syncRecord.startedAt,
  };
}

/**
 * List all files in a OneDrive folder recursively
 */
async function listOneDriveFolderRecursive(
  accessToken: string,
  folderPath: string
): Promise<CloudStorageFile[]> {
  const allFiles: CloudStorageFile[] = [];

  async function listFolder(path: string) {
    let cursor: string | undefined;

    do {
      const contents = await onedriveProvider.listFolders(accessToken, path, cursor);

      // Add files from this folder
      allFiles.push(...contents.files);

      // Recursively process subfolders
      for (const folder of contents.folders) {
        await listFolder(folder.path);
      }

      cursor = contents.hasMore ? contents.cursor : undefined;
    } while (cursor);
  }

  await listFolder(folderPath);
  return allFiles;
}

/**
 * Detect duplicate files by content hash
 */
async function detectDuplicates(
  caseId: string,
  contentHashes: string[]
): Promise<string[]> {
  if (contentHashes.length === 0) {
    return [];
  }

  try {
    // Check for existing documents with matching content hashes
    // OneDrive uses SHA256 hashes stored in a generic field
    const existingDocs = await db
      .select({ dropboxContentHash: documentsTable.dropboxContentHash })
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.caseId, caseId),
          inArray(documentsTable.dropboxContentHash, contentHashes)
        )
      );

    return existingDocs
      .map(d => d.dropboxContentHash)
      .filter((hash): hash is string => hash !== null);
  } catch (error) {
    console.error('[OneDrive Sync] Error detecting duplicates:', error);
    return [];
  }
}

/**
 * Download file from OneDrive and store in Supabase
 */
async function downloadAndStoreFile(
  accessToken: string,
  userId: string,
  caseId: string,
  file: CloudStorageFile
): Promise<{ documentId: string; storagePath: string }> {
  // Download file from OneDrive
  const fileBuffer = await onedriveProvider.downloadFile(accessToken, file.id);

  // Upload to Vercel Blob Storage
  console.log(`[OneDrive Sync] Uploading to Vercel Blob: ${file.name}`);
  const storageUrl = await uploadDocument(caseId, file.name, fileBuffer, file.mimeType || 'application/octet-stream');
  console.log(`[OneDrive Sync] Vercel Blob upload success: ${storageUrl}`);

  // Create document record
  const [document] = await db
    .insert(documentsTable)
    .values({
      caseId,
      userId,
      fileName: file.name,
      storageUrl, // Vercel Blob URL
      fileSize: file.size,
      fileType: getFileExtension(file.name),
      dropboxPath: file.path, // Reusing field for OneDrive path
      dropboxFilePath: file.pathDisplay,
      dropboxFileId: file.id,
      dropboxContentHash: file.contentHash || null,
      source: 'onedrive',
      syncedAt: new Date(),
    })
    .returning();

  console.log(`[OneDrive Sync] Document record created: ${document.id}`);

  return {
    documentId: document.id,
    storagePath: storageUrl,
  };
}

/**
 * Main sync function - syncs all files from a case's OneDrive folder
 */
export async function syncOneDriveFolder(
  caseId: string,
  userId: string
): Promise<SyncResult> {
  const startTime = Date.now();

  // Start sync
  const syncResult = await startSync(caseId, userId);

  const caseRecord = await getCaseWithFolder(caseId, userId);
  const folderPath = caseRecord?.cloudFolderPath || caseRecord?.dropboxFolderPath;

  if (!folderPath) {
    throw new Error('No OneDrive folder mapped');
  }

  const errors: SyncResult['errors'] = [];
  let filesFound = 0;
  let filesNew = 0;
  let filesUpdated = 0;
  let filesSkipped = 0;
  let filesError = 0;
  let filesQueued = 0;
  const newDocumentIds: string[] = [];

  try {
    // Get access token
    const accessToken = await getAccessTokenForUser(userId);

    // Get all files from OneDrive folder recursively
    console.log(`[OneDrive Sync] Starting sync for case ${caseId}, folder: ${folderPath}`);
    const allFiles = await listOneDriveFolderRecursive(accessToken, folderPath);

    filesFound = allFiles.length;
    console.log(`[OneDrive Sync] Found ${filesFound} files in OneDrive folder`);

    // Update progress
    const progress = activeSyncs.get(caseId);
    if (progress) {
      progress.totalFiles = filesFound;
    }

    // Get existing content hashes to detect duplicates
    const existingHashes = await detectDuplicates(
      caseId,
      allFiles.map(f => f.contentHash).filter((h): h is string => !!h)
    );

    // Process each file
    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];

      // Update progress
      if (progress) {
        progress.filesProcessed = i + 1;
        progress.progress = Math.round((i + 1) / filesFound * 100);
        progress.currentFile = file.name;
      }

      // Check if sync was cancelled
      if (progress?.status === 'error') {
        break;
      }

      // Skip if duplicate
      if (file.contentHash && existingHashes.includes(file.contentHash)) {
        filesSkipped++;
        continue;
      }

      // Download and store file
      try {
        console.log(`[OneDrive Sync] Processing file ${i + 1}/${filesFound}: ${file.name}`);
        const result = await downloadAndStoreFile(accessToken, userId, caseId, file);
        console.log(`[OneDrive Sync] Successfully stored: ${file.name} -> ${result.documentId}`);
        filesNew++;
        newDocumentIds.push(result.documentId);
      } catch (error: any) {
        console.error(`[OneDrive Sync] Failed to process ${file.name}:`, error.message);
        filesError++;
        errors.push({
          file: file.name,
          error: error.message || 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Queue all new documents for classification
    if (newDocumentIds.length > 0) {
      console.log(`[OneDrive Sync] Queueing ${newDocumentIds.length} documents for classification`);
      for (const documentId of newDocumentIds) {
        try {
          await addToQueue(documentId, caseId, userId, 0);
          filesQueued++;
        } catch (queueError: any) {
          console.error(`[OneDrive Sync] Failed to queue document ${documentId}:`, queueError.message);
        }
      }
      console.log(`[OneDrive Sync] Queued ${filesQueued} documents for classification`);
    }

    // Update case lastSyncedAt
    await db
      .update(casesTable)
      .set({ lastSyncedAt: new Date() })
      .where(eq(casesTable.id, caseId));

    // Complete sync
    const completedAt = new Date();
    const durationMs = Date.now() - startTime;

    await db
      .update(syncHistoryTable)
      .set({
        status: 'completed',
        filesFound,
        filesNew,
        filesUpdated,
        filesSkipped,
        filesError,
        errors: errors.length > 0 ? errors : null,
        completedAt,
        durationMs,
      })
      .where(eq(syncHistoryTable.id, syncResult.syncId));

    // Clean up progress tracking
    activeSyncs.delete(caseId);

    console.log(`[OneDrive Sync] Completed sync for case ${caseId}: ${filesNew} new, ${filesSkipped} skipped, ${filesError} errors in ${durationMs}ms`);

    return {
      ...syncResult,
      status: 'completed',
      filesFound,
      filesNew,
      filesUpdated,
      filesSkipped,
      filesError,
      filesQueued,
      errors,
      completedAt,
      durationMs,
    };
  } catch (error: any) {
    console.error(`[OneDrive Sync] Fatal error for case ${caseId}:`, error.message || error);
    console.error(`[OneDrive Sync] Error stack:`, error.stack);

    try {
      await db
        .update(syncHistoryTable)
        .set({
          status: 'error',
          errors: [{ file: '', error: error.message || 'Unknown error', timestamp: new Date().toISOString() }],
          completedAt: new Date(),
          durationMs: Date.now() - startTime,
        })
        .where(eq(syncHistoryTable.id, syncResult.syncId));
    } catch (dbError) {
      console.error(`[OneDrive Sync] Failed to update sync history:`, dbError);
    }

    activeSyncs.delete(caseId);

    throw error;
  }
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}
