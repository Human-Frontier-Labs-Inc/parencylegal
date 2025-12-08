/**
 * Dropbox File Sync Service
 * Handles file synchronization from Dropbox to Supabase Storage
 * Using direct fetch API for serverless compatibility
 */

import { db } from '@/db/db';
import { documentsTable, casesTable, syncHistoryTable } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getAccessTokenForUser, listDropboxFolders, type DropboxFile } from './folders';
import { uploadDocument } from '@/lib/storage';
import { addToQueue } from '@/lib/queue/document-processing';

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
  filesQueued: number; // New: Count of files queued for classification
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

// In-memory store for active syncs (in production, use Redis)
const activeSyncs = new Map<string, SyncProgress>();

/**
 * Get case with its Dropbox folder mapping
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
export async function startSync(
  caseId: string,
  userId: string
): Promise<SyncResult> {
  // Check if case exists and belongs to user
  const caseRecord = await getCaseWithFolder(caseId, userId);

  if (!caseRecord) {
    throw new Error('Case not found');
  }

  // Check for folder path in new field first, then legacy field
  const folderPath = caseRecord.cloudFolderPath || caseRecord.dropboxFolderPath;
  if (!folderPath) {
    throw new Error('No Dropbox folder mapped');
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
      source: 'dropbox',
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
 * Get sync status/progress
 */
export async function getSyncStatus(syncId: string): Promise<SyncProgress | null> {
  // Check active syncs first
  for (const progress of activeSyncs.values()) {
    if (progress.syncId === syncId) {
      return progress;
    }
  }

  // Check database for completed syncs
  const [syncRecord] = await db
    .select()
    .from(syncHistoryTable)
    .where(eq(syncHistoryTable.id, syncId))
    .limit(1);

  if (!syncRecord) {
    return null;
  }

  return {
    syncId: syncRecord.id,
    status: syncRecord.status as 'completed' | 'error',
    progress: 100,
    filesProcessed: syncRecord.filesNew || 0 + (syncRecord.filesUpdated || 0) + (syncRecord.filesSkipped || 0),
    totalFiles: syncRecord.filesFound || 0,
  };
}

/**
 * Get sync history for a case
 */
export async function getSyncHistory(caseId: string): Promise<SyncResult[]> {
  const records = await db
    .select()
    .from(syncHistoryTable)
    .where(eq(syncHistoryTable.caseId, caseId))
    .orderBy(syncHistoryTable.startedAt);

  return records.map(record => ({
    syncId: record.id,
    caseId: record.caseId,
    status: record.status as SyncResult['status'],
    filesFound: record.filesFound || 0,
    filesNew: record.filesNew || 0,
    filesUpdated: record.filesUpdated || 0,
    filesSkipped: record.filesSkipped || 0,
    filesError: record.filesError || 0,
    errors: (record.errors || []) as SyncResult['errors'],
    startedAt: record.startedAt,
    completedAt: record.completedAt || undefined,
    durationMs: record.durationMs || undefined,
  })).reverse(); // Most recent first
}

/**
 * Cancel an ongoing sync
 */
export async function cancelSync(syncId: string): Promise<boolean> {
  // Find and update in-memory tracking
  for (const [caseId, progress] of activeSyncs.entries()) {
    if (progress.syncId === syncId) {
      progress.status = 'error';
      activeSyncs.delete(caseId);

      // Update database
      await db
        .update(syncHistoryTable)
        .set({
          status: 'error',
          completedAt: new Date(),
          errors: [{ file: '', error: 'Cancelled by user', timestamp: new Date().toISOString() }],
        })
        .where(eq(syncHistoryTable.id, syncId));

      return true;
    }
  }

  return false;
}

/**
 * Detect duplicate files by content hash
 * Returns content hashes that already exist in the database
 */
export async function detectDuplicates(
  caseId: string,
  contentHashes: string[]
): Promise<string[]> {
  // Handle empty array - inArray with empty array causes SQL error
  if (contentHashes.length === 0) {
    return [];
  }

  try {
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
    console.error('Error detecting duplicates:', error);
    // Return empty array on error - will try to sync all files
    return [];
  }
}

/**
 * Download file from Dropbox and store in Supabase
 * Using direct fetch API for serverless compatibility
 */
export async function downloadAndStoreFile(
  userId: string,
  dropboxPath: string,
  caseId: string,
  fileMetadata: DropboxFile
): Promise<{ documentId: string; storagePath: string }> {
  const accessToken = await getAccessTokenForUser(userId);

  // Download file from Dropbox using direct fetch
  const downloadResponse = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Dropbox-API-Arg': JSON.stringify({ path: dropboxPath }),
    },
  });

  if (!downloadResponse.ok) {
    const errorText = await downloadResponse.text();
    console.error('Dropbox download failed:', downloadResponse.status, errorText);
    throw new Error(`Failed to download file from Dropbox: ${downloadResponse.status}`);
  }

  const fileBlob = await downloadResponse.arrayBuffer();
  const fileName = fileMetadata.name;

  // Upload to Vercel Blob Storage
  console.log(`[Sync] Uploading to Vercel Blob: ${fileName}`);
  const storageUrl = await uploadDocument(caseId, fileName, Buffer.from(fileBlob), getMimeType(fileName));
  console.log(`[Sync] Vercel Blob upload success: ${storageUrl}`);

  // Create document record
  console.log(`[Sync] Inserting document record for: ${fileName}`);
  const [document] = await db
    .insert(documentsTable)
    .values({
      caseId,
      userId,
      fileName,
      storageUrl, // Vercel Blob URL
      fileSize: fileMetadata.size,
      fileType: getFileExtension(fileName),
      dropboxPath: fileMetadata.path,
      dropboxFilePath: fileMetadata.pathDisplay,
      dropboxFileId: fileMetadata.id,
      dropboxContentHash: fileMetadata.contentHash,
      source: 'dropbox',
      syncedAt: new Date(),
    })
    .returning();

  console.log(`[Sync] Document record created: ${document.id}`);

  return {
    documentId: document.id,
    storagePath: storageUrl,
  };
}

/**
 * Main sync function - syncs all files from a case's Dropbox folder
 */
export async function syncDropboxFolder(
  caseId: string,
  userId: string
): Promise<SyncResult> {
  const startTime = Date.now();

  // Start sync
  const syncResult = await startSync(caseId, userId);

  const caseRecord = await getCaseWithFolder(caseId, userId);
  // Check for folder path in new field first, then legacy field
  const folderPath = caseRecord?.cloudFolderPath || caseRecord?.dropboxFolderPath;
  if (!folderPath) {
    throw new Error('No Dropbox folder mapped');
  }

  const errors: SyncResult['errors'] = [];
  let filesFound = 0;
  let filesNew = 0;
  let filesUpdated = 0;
  let filesSkipped = 0;
  let filesError = 0;
  let filesQueued = 0;
  const newDocumentIds: string[] = []; // Track new documents for queueing

  try {
    // Get all files from Dropbox folder (recursively)
    const allFiles: DropboxFile[] = [];
    let cursor: string | undefined;

    console.log(`[Sync] Starting sync for case ${caseId}, folder: ${folderPath}`);

    do {
      const contents = await listDropboxFolders(
        userId,
        folderPath,
        cursor
      );

      allFiles.push(...contents.files);
      cursor = contents.hasMore ? contents.cursor : undefined;
    } while (cursor);

    filesFound = allFiles.length;
    console.log(`[Sync] Found ${filesFound} files in Dropbox folder`);

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
        console.log(`[Sync] Processing file ${i + 1}/${filesFound}: ${file.name}`);
        const result = await downloadAndStoreFile(userId, file.path, caseId, file);
        console.log(`[Sync] Successfully stored: ${file.name} -> ${result.documentId}`);
        filesNew++;
        newDocumentIds.push(result.documentId); // Track for classification queue
      } catch (error: any) {
        console.error(`[Sync] Failed to process ${file.name}:`, error.message);
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
      console.log(`[Sync] Queueing ${newDocumentIds.length} documents for classification`);
      for (const documentId of newDocumentIds) {
        try {
          await addToQueue(documentId, caseId, userId, 0);
          filesQueued++;
        } catch (queueError: any) {
          console.error(`[Sync] Failed to queue document ${documentId}:`, queueError.message);
          // Don't fail the sync for queue errors
        }
      }
      console.log(`[Sync] Queued ${filesQueued} documents for classification`);
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
        // Note: filesQueued not stored in sync_history but included in response
      })
      .where(eq(syncHistoryTable.id, syncResult.syncId));

    // Clean up progress tracking
    activeSyncs.delete(caseId);

    console.log(`[Sync] Completed sync for case ${caseId}: ${filesNew} new, ${filesSkipped} skipped, ${filesError} errors in ${durationMs}ms`);

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
    // Handle fatal errors
    console.error(`[Sync] Fatal error for case ${caseId}:`, error.message || error);
    console.error(`[Sync] Error stack:`, error.stack);

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
      console.error(`[Sync] Failed to update sync history:`, dbError);
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

/**
 * Get MIME type from filename
 */
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    txt: 'text/plain',
    csv: 'text/csv',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}
