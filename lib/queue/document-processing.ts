/**
 * Document Processing Queue Service
 * Phase 4: Auto-Classification & Configurable Models
 * Handles document classification queue operations
 */

import { db } from '@/db/db';
import { documentProcessingQueueTable, QUEUE_STATUS, type QueueStatus } from '@/db/schema/document-processing-queue-schema';
import { documentsTable } from '@/db/schema';
import { eq, and, or, lt, isNull, asc, sql } from 'drizzle-orm';
import { classifyAndStore } from '@/lib/ai/classification';
import { getClassificationConfig } from '@/lib/ai/model-config';

// Constants
const DEFAULT_MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [60000, 300000, 900000]; // 1min, 5min, 15min

export interface QueueItem {
  id: string;
  documentId: string;
  caseId: string;
  userId: string;
  status: QueueStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  nextRetryAt: Date | null;
  processingTimeMs: number | null;
  tokensUsed: number | null;
  modelUsed: string | null;
}

export interface AddToQueueResult {
  id: string;
  documentId: string;
  status: QueueStatus;
}

export interface ProcessingResult {
  id: string;
  documentId: string;
  success: boolean;
  processingTimeMs: number;
  tokensUsed?: number;
  error?: string;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

/**
 * Add a document to the processing queue
 */
export async function addToQueue(
  documentId: string,
  caseId: string,
  userId: string,
  priority: number = 0
): Promise<AddToQueueResult> {
  // Check if document is already in queue
  const existing = await db
    .select()
    .from(documentProcessingQueueTable)
    .where(
      and(
        eq(documentProcessingQueueTable.documentId, documentId),
        or(
          eq(documentProcessingQueueTable.status, QUEUE_STATUS.PENDING),
          eq(documentProcessingQueueTable.status, QUEUE_STATUS.PROCESSING)
        )
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return {
      id: existing[0].id,
      documentId: existing[0].documentId,
      status: existing[0].status as QueueStatus,
    };
  }

  const [item] = await db
    .insert(documentProcessingQueueTable)
    .values({
      documentId,
      caseId,
      userId,
      priority,
      status: QUEUE_STATUS.PENDING,
      attempts: 0,
      maxAttempts: DEFAULT_MAX_ATTEMPTS,
    })
    .returning();

  return {
    id: item.id,
    documentId: item.documentId,
    status: item.status as QueueStatus,
  };
}

/**
 * Add multiple documents to the queue
 */
export async function addBatchToQueue(
  documents: Array<{ documentId: string; caseId: string; userId: string; priority?: number }>
): Promise<AddToQueueResult[]> {
  const results: AddToQueueResult[] = [];

  for (const doc of documents) {
    const result = await addToQueue(doc.documentId, doc.caseId, doc.userId, doc.priority || 0);
    results.push(result);
  }

  return results;
}

/**
 * Get the next item to process from the queue
 * Ordered by priority (desc) then createdAt (asc)
 */
export async function getNextInQueue(): Promise<QueueItem | null> {
  const now = new Date();

  // Get pending items or failed items ready for retry
  const [item] = await db
    .select()
    .from(documentProcessingQueueTable)
    .where(
      or(
        eq(documentProcessingQueueTable.status, QUEUE_STATUS.PENDING),
        and(
          eq(documentProcessingQueueTable.status, QUEUE_STATUS.FAILED),
          lt(documentProcessingQueueTable.nextRetryAt, now)
        )
      )
    )
    .orderBy(
      sql`${documentProcessingQueueTable.priority} DESC`,
      asc(documentProcessingQueueTable.createdAt)
    )
    .limit(1);

  if (!item) return null;

  // Check if max attempts exceeded
  if (item.attempts >= item.maxAttempts) {
    return null;
  }

  return item as QueueItem;
}

/**
 * Mark item as processing
 */
export async function markProcessing(id: string): Promise<void> {
  await db
    .update(documentProcessingQueueTable)
    .set({
      status: QUEUE_STATUS.PROCESSING,
      startedAt: new Date(),
      attempts: sql`${documentProcessingQueueTable.attempts} + 1`,
    })
    .where(eq(documentProcessingQueueTable.id, id));
}

/**
 * Mark item as completed
 */
export async function markCompleted(
  id: string,
  processingTimeMs: number,
  tokensUsed?: number,
  modelUsed?: string
): Promise<void> {
  await db
    .update(documentProcessingQueueTable)
    .set({
      status: QUEUE_STATUS.COMPLETED,
      completedAt: new Date(),
      processingTimeMs,
      tokensUsed,
      modelUsed,
      errorMessage: null,
    })
    .where(eq(documentProcessingQueueTable.id, id));
}

/**
 * Mark item as failed with retry scheduling
 */
export async function markFailed(
  id: string,
  errorMessage: string,
  attempts: number
): Promise<void> {
  const retryDelay = RETRY_DELAYS_MS[Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)];
  const nextRetryAt = new Date(Date.now() + retryDelay);

  await db
    .update(documentProcessingQueueTable)
    .set({
      status: QUEUE_STATUS.FAILED,
      errorMessage,
      nextRetryAt,
    })
    .where(eq(documentProcessingQueueTable.id, id));
}

/**
 * Process the next item in the queue
 */
export async function processNextInQueue(): Promise<ProcessingResult | null> {
  const item = await getNextInQueue();
  if (!item) return null;

  const startTime = Date.now();

  try {
    // Mark as processing
    await markProcessing(item.id);

    // Get model config
    const modelConfig = getClassificationConfig();

    // Process the document
    const result = await classifyAndStore(item.documentId, item.userId);

    const processingTimeMs = Date.now() - startTime;

    // Mark as completed
    await markCompleted(
      item.id,
      processingTimeMs,
      result.tokensUsed,
      modelConfig.model
    );

    return {
      id: item.id,
      documentId: item.documentId,
      success: true,
      processingTimeMs,
      tokensUsed: result.tokensUsed,
    };
  } catch (error: any) {
    const processingTimeMs = Date.now() - startTime;
    const errorMessage = error.message || 'Unknown error';

    // Mark as failed
    await markFailed(item.id, errorMessage, item.attempts + 1);

    return {
      id: item.id,
      documentId: item.documentId,
      success: false,
      processingTimeMs,
      error: errorMessage,
    };
  }
}

/**
 * Get queue item by document ID
 */
export async function getQueueItem(documentId: string): Promise<QueueItem | null> {
  const [item] = await db
    .select()
    .from(documentProcessingQueueTable)
    .where(eq(documentProcessingQueueTable.documentId, documentId))
    .orderBy(sql`${documentProcessingQueueTable.createdAt} DESC`)
    .limit(1);

  return item as QueueItem | null;
}

/**
 * Get all queued documents for a case
 */
export async function getQueuedDocuments(caseId: string): Promise<QueueItem[]> {
  const items = await db
    .select()
    .from(documentProcessingQueueTable)
    .where(eq(documentProcessingQueueTable.caseId, caseId))
    .orderBy(
      sql`${documentProcessingQueueTable.priority} DESC`,
      asc(documentProcessingQueueTable.createdAt)
    );

  return items as QueueItem[];
}

/**
 * Get processing status for a case
 */
export async function getCaseProcessingStatus(caseId: string): Promise<QueueStats> {
  const items = await db
    .select()
    .from(documentProcessingQueueTable)
    .where(eq(documentProcessingQueueTable.caseId, caseId));

  const stats: QueueStats = {
    total: items.length,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };

  for (const item of items) {
    switch (item.status) {
      case QUEUE_STATUS.PENDING:
        stats.pending++;
        break;
      case QUEUE_STATUS.PROCESSING:
        stats.processing++;
        break;
      case QUEUE_STATUS.COMPLETED:
        stats.completed++;
        break;
      case QUEUE_STATUS.FAILED:
        stats.failed++;
        break;
    }
  }

  return stats;
}

/**
 * Get global queue stats
 */
export async function getGlobalQueueStats(): Promise<QueueStats> {
  const items = await db
    .select()
    .from(documentProcessingQueueTable);

  const stats: QueueStats = {
    total: items.length,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };

  for (const item of items) {
    switch (item.status) {
      case QUEUE_STATUS.PENDING:
        stats.pending++;
        break;
      case QUEUE_STATUS.PROCESSING:
        stats.processing++;
        break;
      case QUEUE_STATUS.COMPLETED:
        stats.completed++;
        break;
      case QUEUE_STATUS.FAILED:
        stats.failed++;
        break;
    }
  }

  return stats;
}

/**
 * Clean up old completed/failed items
 */
export async function cleanupOldItems(olderThanDays: number = 7): Promise<number> {
  const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const result = await db
    .delete(documentProcessingQueueTable)
    .where(
      and(
        or(
          eq(documentProcessingQueueTable.status, QUEUE_STATUS.COMPLETED),
          and(
            eq(documentProcessingQueueTable.status, QUEUE_STATUS.FAILED),
            sql`${documentProcessingQueueTable.attempts} >= ${documentProcessingQueueTable.maxAttempts}`
          )
        ),
        lt(documentProcessingQueueTable.createdAt, cutoffDate)
      )
    )
    .returning();

  return result.length;
}

/**
 * Cancel processing for a case
 */
export async function cancelCaseProcessing(caseId: string): Promise<number> {
  const result = await db
    .delete(documentProcessingQueueTable)
    .where(
      and(
        eq(documentProcessingQueueTable.caseId, caseId),
        or(
          eq(documentProcessingQueueTable.status, QUEUE_STATUS.PENDING),
          eq(documentProcessingQueueTable.status, QUEUE_STATUS.FAILED)
        )
      )
    )
    .returning();

  return result.length;
}
