/**
 * Export Service
 * Phase 9: Timeline, Search & Export
 *
 * Handles PDF export job creation and management
 */

import { db } from "@/db/db";
import { documentsTable, casesTable, discoveryRequestsTable } from "@/db/schema";
import {
  exportJobsTable,
  EXPORT_STATUS,
  EXPORT_TYPE,
  ExportOptions,
  ExportResult,
  InsertExportJob,
  SelectExportJob,
} from "@/db/schema/export-jobs-schema";
import { documentRequestMappingsTable } from "@/db/schema/document-request-mappings-schema";
import { eq, and, inArray, isNotNull } from "drizzle-orm";
import {
  generateCoverPage,
  generateTableOfContents,
  groupDocumentsByCategory,
  formatDocumentForExport,
  validateExportOptions,
} from "./pdf-utils";

export interface ExportByCategoryConfig {
  categories: string[];
  options?: Partial<ExportOptions>;
}

export interface ExportByDiscoveryConfig {
  requestIds: string[];
  options?: Partial<ExportOptions>;
}

/**
 * Create an export job for selected categories
 */
export async function createCategoryExportJob(
  caseId: string,
  userId: string,
  config: ExportByCategoryConfig
): Promise<SelectExportJob> {
  if (!config.categories || config.categories.length === 0) {
    throw new Error("At least one category is required for export");
  }

  const validation = validateExportOptions(config.options || {});
  if (!validation.valid) {
    throw new Error(`Invalid export options: ${validation.errors.join(", ")}`);
  }

  const [job] = await db
    .insert(exportJobsTable)
    .values({
      caseId,
      userId,
      type: EXPORT_TYPE.CATEGORY,
      status: EXPORT_STATUS.PENDING,
      progress: 0,
      config: {
        categories: config.categories,
        options: validation.normalized,
      },
    })
    .returning();

  return job;
}

/**
 * Create an export job for discovery requests
 */
export async function createDiscoveryExportJob(
  caseId: string,
  userId: string,
  config: ExportByDiscoveryConfig
): Promise<SelectExportJob> {
  if (!config.requestIds || config.requestIds.length === 0) {
    throw new Error("At least one request ID is required for export");
  }

  const validation = validateExportOptions(config.options || {});
  if (!validation.valid) {
    throw new Error(`Invalid export options: ${validation.errors.join(", ")}`);
  }

  // Verify request IDs belong to the case
  const requests = await db
    .select({ id: discoveryRequestsTable.id })
    .from(discoveryRequestsTable)
    .where(
      and(
        eq(discoveryRequestsTable.caseId, caseId),
        eq(discoveryRequestsTable.userId, userId),
        inArray(discoveryRequestsTable.id, config.requestIds)
      )
    );

  if (requests.length !== config.requestIds.length) {
    throw new Error("Some request IDs do not belong to this case");
  }

  const [job] = await db
    .insert(exportJobsTable)
    .values({
      caseId,
      userId,
      type: EXPORT_TYPE.DISCOVERY,
      status: EXPORT_STATUS.PENDING,
      progress: 0,
      config: {
        requestIds: config.requestIds,
        options: validation.normalized,
      },
    })
    .returning();

  return job;
}

/**
 * Create a timeline export job
 */
export async function createTimelineExportJob(
  caseId: string,
  userId: string,
  options?: Partial<ExportOptions>
): Promise<SelectExportJob> {
  const validation = validateExportOptions(options || {});
  if (!validation.valid) {
    throw new Error(`Invalid export options: ${validation.errors.join(", ")}`);
  }

  const [job] = await db
    .insert(exportJobsTable)
    .values({
      caseId,
      userId,
      type: EXPORT_TYPE.TIMELINE,
      status: EXPORT_STATUS.PENDING,
      progress: 0,
      config: {
        options: validation.normalized,
      },
    })
    .returning();

  return job;
}

/**
 * Get export job status
 */
export async function getExportJobStatus(
  jobId: string,
  userId: string
): Promise<SelectExportJob | null> {
  const [job] = await db
    .select()
    .from(exportJobsTable)
    .where(and(eq(exportJobsTable.id, jobId), eq(exportJobsTable.userId, userId)))
    .limit(1);

  return job || null;
}

/**
 * Get download URL for completed export
 * With Vercel Blob, storagePath is the full public URL
 */
export async function getExportDownloadUrl(
  jobId: string,
  userId: string
): Promise<{ url: string; fileName: string } | null> {
  const job = await getExportJobStatus(jobId, userId);

  if (!job || job.status !== EXPORT_STATUS.COMPLETED || !job.storagePath) {
    return null;
  }

  // Vercel Blob URLs are public - no signing needed
  return {
    url: job.storagePath,
    fileName: job.result?.fileName || `export-${jobId}.pdf`,
  };
}

/**
 * Update job progress
 */
export async function updateJobProgress(
  jobId: string,
  progress: number,
  status?: typeof EXPORT_STATUS[keyof typeof EXPORT_STATUS]
): Promise<void> {
  const updates: Partial<InsertExportJob> = {
    progress: Math.min(100, Math.max(0, progress)),
  };

  if (status) {
    updates.status = status;
    if (status === EXPORT_STATUS.PROCESSING && !updates.startedAt) {
      updates.startedAt = new Date();
    }
    if (status === EXPORT_STATUS.COMPLETED || status === EXPORT_STATUS.FAILED) {
      updates.completedAt = new Date();
    }
  }

  await db
    .update(exportJobsTable)
    .set(updates)
    .where(eq(exportJobsTable.id, jobId));
}

/**
 * Mark job as completed with result
 */
export async function completeJob(
  jobId: string,
  result: ExportResult,
  storagePath: string
): Promise<void> {
  // Set expiry to 7 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db
    .update(exportJobsTable)
    .set({
      status: EXPORT_STATUS.COMPLETED,
      progress: 100,
      result,
      storagePath,
      completedAt: new Date(),
      expiresAt,
    })
    .where(eq(exportJobsTable.id, jobId));
}

/**
 * Mark job as failed
 */
export async function failJob(jobId: string, error: string): Promise<void> {
  await db
    .update(exportJobsTable)
    .set({
      status: EXPORT_STATUS.FAILED,
      errorMessage: error,
      completedAt: new Date(),
      result: {
        documentCount: 0,
        generatedAt: new Date().toISOString(),
        error,
      },
    })
    .where(eq(exportJobsTable.id, jobId));
}

/**
 * Get documents for category export
 */
export async function getDocumentsForCategoryExport(
  caseId: string,
  userId: string,
  categories: string[]
): Promise<Array<{
  id: string;
  fileName: string;
  category: string | null;
  subtype: string | null;
  documentDate: Date | null;
  storagePath: string;
  metadata: any;
}>> {
  return db
    .select({
      id: documentsTable.id,
      fileName: documentsTable.fileName,
      category: documentsTable.category,
      subtype: documentsTable.subtype,
      documentDate: documentsTable.documentDate,
      storagePath: documentsTable.storagePath,
      metadata: documentsTable.metadata,
    })
    .from(documentsTable)
    .where(
      and(
        eq(documentsTable.caseId, caseId),
        eq(documentsTable.userId, userId),
        inArray(documentsTable.category, categories)
      )
    )
    .orderBy(documentsTable.documentDate, documentsTable.fileName);
}

/**
 * Get documents for discovery request export
 */
export async function getDocumentsForDiscoveryExport(
  caseId: string,
  userId: string,
  requestIds: string[]
): Promise<Array<{
  id: string;
  fileName: string;
  category: string | null;
  subtype: string | null;
  documentDate: Date | null;
  storagePath: string;
  metadata: any;
  requestId: string;
  requestNumber: number;
  requestType: string;
}>> {
  const results = await db
    .select({
      id: documentsTable.id,
      fileName: documentsTable.fileName,
      category: documentsTable.category,
      subtype: documentsTable.subtype,
      documentDate: documentsTable.documentDate,
      storagePath: documentsTable.storagePath,
      metadata: documentsTable.metadata,
      requestId: documentRequestMappingsTable.requestId,
      requestNumber: discoveryRequestsTable.number,
      requestType: discoveryRequestsTable.type,
    })
    .from(documentRequestMappingsTable)
    .innerJoin(
      documentsTable,
      eq(documentRequestMappingsTable.documentId, documentsTable.id)
    )
    .innerJoin(
      discoveryRequestsTable,
      eq(documentRequestMappingsTable.requestId, discoveryRequestsTable.id)
    )
    .where(
      and(
        eq(documentRequestMappingsTable.caseId, caseId),
        inArray(documentRequestMappingsTable.requestId, requestIds)
      )
    )
    .orderBy(
      discoveryRequestsTable.type,
      discoveryRequestsTable.number,
      documentsTable.fileName
    );

  return results;
}

/**
 * List user's export jobs
 */
export async function listExportJobs(
  caseId: string,
  userId: string,
  status?: typeof EXPORT_STATUS[keyof typeof EXPORT_STATUS]
): Promise<SelectExportJob[]> {
  const conditions = [
    eq(exportJobsTable.caseId, caseId),
    eq(exportJobsTable.userId, userId),
  ];

  if (status) {
    conditions.push(eq(exportJobsTable.status, status));
  }

  return db
    .select()
    .from(exportJobsTable)
    .where(and(...conditions))
    .orderBy(exportJobsTable.createdAt);
}
