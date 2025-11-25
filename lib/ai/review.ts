/**
 * Classification Review Workflow Service
 * Handles attorney review, overrides, and bulk operations
 */

import { db } from '@/db/db';
import { documentsTable } from '@/db/schema';
import { eq, and, gte, lte, isNull, isNotNull } from 'drizzle-orm';
import { DOCUMENT_CATEGORIES, classifyDocument } from './openai';

// Types
export interface DocumentClassification {
  id: string;
  documentId: string;
  fileName: string;
  category: string | null;
  subtype: string | null;
  confidence: number;
  needsReview: boolean;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  metadata: Record<string, any>;
}

export interface OverrideResult {
  success: boolean;
  documentId: string;
  previousCategory: string | null;
  previousSubtype: string | null;
  newCategory: string;
  newSubtype: string;
  overriddenBy: string;
  timestamp: Date;
}

export interface BulkActionResult {
  processed: number;
  accepted: number;
  rejected: number;
  errors: string[];
}

export interface ClassificationHistoryEntry {
  timestamp: string;
  category: string;
  subtype: string;
  confidence: number;
  source: 'ai' | 'manual_override';
  userId?: string;
}

/**
 * Validate category and subtype combination
 */
export function validateCategorySubtype(category: string, subtype: string): boolean {
  const validSubtypes = DOCUMENT_CATEGORIES[category as keyof typeof DOCUMENT_CATEGORIES];
  if (!validSubtypes) return false;
  return validSubtypes.includes(subtype as any);
}

/**
 * Get documents for review with optional filters
 */
export async function getDocumentsForReview(
  caseId: string,
  filters?: {
    needsReview?: boolean;
    category?: string;
    minConfidence?: number;
    maxConfidence?: number;
  }
): Promise<DocumentClassification[]> {
  let query = db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.caseId, caseId));

  const documents = await query;

  // Apply filters in memory (could be optimized with SQL)
  let filtered = documents;

  if (filters?.needsReview !== undefined) {
    filtered = filtered.filter(d => d.needsReview === filters.needsReview);
  }

  if (filters?.category) {
    filtered = filtered.filter(d => d.category === filters.category);
  }

  if (filters?.minConfidence !== undefined) {
    filtered = filtered.filter(d => (d.confidence || 0) / 100 >= filters.minConfidence!);
  }

  if (filters?.maxConfidence !== undefined) {
    filtered = filtered.filter(d => (d.confidence || 0) / 100 <= filters.maxConfidence!);
  }

  return filtered.map(doc => ({
    id: doc.id,
    documentId: doc.id,
    fileName: doc.fileName,
    category: doc.category,
    subtype: doc.subtype,
    confidence: (doc.confidence || 0) / 100,
    needsReview: doc.needsReview || false,
    reviewedAt: doc.reviewedAt,
    reviewedBy: doc.reviewedBy,
    metadata: (doc.metadata || {}) as Record<string, any>,
  }));
}

/**
 * Override document classification
 */
export async function overrideClassification(
  documentId: string,
  userId: string,
  newClassification: { category: string; subtype: string }
): Promise<OverrideResult> {
  // Validate combination
  if (!validateCategorySubtype(newClassification.category, newClassification.subtype)) {
    throw new Error('Invalid category/subtype combination');
  }

  // Get current classification
  const [document] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, documentId))
    .limit(1);

  if (!document) {
    throw new Error('Document not found');
  }

  const previousCategory = document.category;
  const previousSubtype = document.subtype;

  // Create history entry
  const historyEntry: ClassificationHistoryEntry = {
    timestamp: new Date().toISOString(),
    category: newClassification.category,
    subtype: newClassification.subtype,
    confidence: 1, // 100% for manual override
    source: 'manual_override',
    userId,
  };

  const existingHistory = (document.classificationHistory || []) as ClassificationHistoryEntry[];

  // Update document
  await db
    .update(documentsTable)
    .set({
      category: newClassification.category,
      subtype: newClassification.subtype,
      confidence: 100, // 100% for manual override
      needsReview: false,
      reviewedAt: new Date(),
      reviewedBy: userId,
      classificationHistory: [historyEntry, ...existingHistory],
    })
    .where(eq(documentsTable.id, documentId));

  return {
    success: true,
    documentId,
    previousCategory,
    previousSubtype,
    newCategory: newClassification.category,
    newSubtype: newClassification.subtype,
    overriddenBy: userId,
    timestamp: new Date(),
  };
}

/**
 * Accept AI classification
 */
export async function acceptClassification(
  documentId: string,
  userId: string
): Promise<boolean> {
  const [document] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, documentId))
    .limit(1);

  if (!document) {
    throw new Error('Document not found');
  }

  // Add acceptance to history
  const historyEntry: ClassificationHistoryEntry = {
    timestamp: new Date().toISOString(),
    category: document.category || 'Other',
    subtype: document.subtype || 'Miscellaneous',
    confidence: (document.confidence || 0) / 100,
    source: 'ai', // Accepted AI classification
    userId,
  };

  const existingHistory = (document.classificationHistory || []) as ClassificationHistoryEntry[];

  await db
    .update(documentsTable)
    .set({
      needsReview: false,
      reviewedAt: new Date(),
      reviewedBy: userId,
      classificationHistory: [historyEntry, ...existingHistory],
    })
    .where(eq(documentsTable.id, documentId));

  return true;
}

/**
 * Reject classification
 */
export async function rejectClassification(
  documentId: string,
  userId: string,
  reason: string
): Promise<boolean> {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Reason is required');
  }

  const [document] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, documentId))
    .limit(1);

  if (!document) {
    throw new Error('Document not found');
  }

  // Update metadata to include rejection reason
  const updatedMetadata = {
    ...(document.metadata as Record<string, any> || {}),
    rejectionReason: reason,
    rejectedBy: userId,
    rejectedAt: new Date().toISOString(),
  };

  await db
    .update(documentsTable)
    .set({
      needsReview: true, // Keep flagged for review
      metadata: updatedMetadata,
    })
    .where(eq(documentsTable.id, documentId));

  return true;
}

/**
 * Bulk accept high-confidence classifications
 */
export async function bulkAcceptClassifications(
  caseId: string,
  minConfidence: number,
  userId: string
): Promise<BulkActionResult> {
  const documents = await getDocumentsForReview(caseId, {
    needsReview: true,
    minConfidence,
  });

  let accepted = 0;
  let rejected = 0;
  const errors: string[] = [];

  for (const doc of documents) {
    try {
      await acceptClassification(doc.documentId, userId);
      accepted++;
    } catch (error: any) {
      rejected++;
      errors.push(`${doc.documentId}: ${error.message}`);
    }
  }

  return {
    processed: documents.length,
    accepted,
    rejected,
    errors,
  };
}

/**
 * Bulk reject documents
 */
export async function bulkRejectClassifications(
  documentIds: string[],
  userId: string,
  reason: string
): Promise<BulkActionResult> {
  if (!reason || reason.trim().length === 0) {
    throw new Error('Reason is required');
  }

  let processed = 0;
  let rejected = 0;
  const errors: string[] = [];

  for (const docId of documentIds) {
    try {
      await rejectClassification(docId, userId, reason);
      processed++;
      rejected++;
    } catch (error: any) {
      errors.push(`${docId}: ${error.message}`);
    }
  }

  return {
    processed,
    accepted: 0,
    rejected,
    errors,
  };
}

/**
 * Request re-classification of a document
 */
export async function requestReclassification(
  documentId: string,
  userId: string,
  hints?: string
): Promise<DocumentClassification> {
  const [document] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, documentId))
    .limit(1);

  if (!document) {
    throw new Error('Document not found');
  }

  // TODO: Re-extract text and classify with hints
  // For now, just mark for review
  await db
    .update(documentsTable)
    .set({
      needsReview: true,
      metadata: {
        ...(document.metadata as Record<string, any> || {}),
        reclassificationRequested: true,
        reclassificationHints: hints,
        requestedBy: userId,
        requestedAt: new Date().toISOString(),
      },
    })
    .where(eq(documentsTable.id, documentId));

  return {
    id: document.id,
    documentId: document.id,
    fileName: document.fileName,
    category: document.category,
    subtype: document.subtype,
    confidence: (document.confidence || 0) / 100,
    needsReview: true,
    reviewedAt: document.reviewedAt,
    reviewedBy: document.reviewedBy,
    metadata: document.metadata as Record<string, any> || {},
  };
}

/**
 * Get classification history for a document
 */
export async function getClassificationHistory(
  documentId: string
): Promise<ClassificationHistoryEntry[]> {
  const [document] = await db
    .select({ classificationHistory: documentsTable.classificationHistory })
    .from(documentsTable)
    .where(eq(documentsTable.id, documentId))
    .limit(1);

  if (!document) {
    throw new Error('Document not found');
  }

  const history = (document.classificationHistory || []) as ClassificationHistoryEntry[];

  // Sort by timestamp descending (most recent first)
  return history.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Get review statistics for a case
 */
export async function getReviewStats(caseId: string): Promise<{
  total: number;
  reviewed: number;
  pending: number;
  accepted: number;
  overridden: number;
  avgConfidence: number;
}> {
  const documents = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.caseId, caseId));

  const total = documents.length;
  const reviewed = documents.filter(d => d.reviewedAt).length;
  const pending = documents.filter(d => d.needsReview && !d.reviewedAt).length;

  // Count overrides from history
  let overridden = 0;
  for (const doc of documents) {
    const history = (doc.classificationHistory || []) as ClassificationHistoryEntry[];
    if (history.some(h => h.source === 'manual_override')) {
      overridden++;
    }
  }

  const accepted = reviewed - overridden;

  const confidences = documents
    .filter(d => d.confidence)
    .map(d => d.confidence || 0);
  const avgConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length
    : 0;

  return {
    total,
    reviewed,
    pending,
    accepted,
    overridden,
    avgConfidence,
  };
}
