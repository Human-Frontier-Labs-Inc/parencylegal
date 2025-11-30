/**
 * Immediate Document Analysis API
 * Processes unclassified documents immediately (no queue)
 * Better for Vercel Hobby plan where crons only run daily
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { casesTable, documentsTable } from '@/db/schema';
import { documentProcessingQueueTable, QUEUE_STATUS } from '@/db/schema/document-processing-queue-schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { classifyAndStore } from '@/lib/ai/classification';

// Process up to 5 documents per request to avoid timeout
const MAX_DOCS_PER_REQUEST = 5;

// GET handler for browser testing
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleAnalyze(request, params);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleAnalyze(request, params);
}

async function handleAnalyze(
  request: Request,
  params: Promise<{ id: string }>
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: caseId } = await params;

    // Verify case belongs to user
    const [caseRecord] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)))
      .limit(1);

    if (!caseRecord) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      );
    }

    // Get unclassified documents
    const unclassifiedDocs = await db
      .select({ id: documentsTable.id, fileName: documentsTable.fileName })
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.caseId, caseId),
          eq(documentsTable.userId, userId),
          isNull(documentsTable.category)
        )
      )
      .limit(MAX_DOCS_PER_REQUEST);

    if (unclassifiedDocs.length === 0) {
      // Count total documents for stats
      const allDocs = await db
        .select({ id: documentsTable.id })
        .from(documentsTable)
        .where(
          and(
            eq(documentsTable.caseId, caseId),
            eq(documentsTable.userId, userId)
          )
        );

      return NextResponse.json({
        success: true,
        message: 'All documents already classified',
        processed: 0,
        total: allDocs.length,
        remaining: 0,
      });
    }

    // Count total unclassified for progress
    const totalUnclassified = await db
      .select({ id: documentsTable.id })
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.caseId, caseId),
          eq(documentsTable.userId, userId),
          isNull(documentsTable.category)
        )
      );

    // Process documents immediately
    const results: Array<{
      documentId: string;
      fileName: string;
      success: boolean;
      category?: string;
      error?: string;
    }> = [];

    for (const doc of unclassifiedDocs) {
      try {
        const result = await classifyAndStore(doc.id, userId);
        results.push({
          documentId: doc.id,
          fileName: doc.fileName,
          success: true,
          category: result.category,
        });
      } catch (error: any) {
        console.error(`[AnalyzeDocs] Failed to classify ${doc.fileName}:`, error);
        results.push({
          documentId: doc.id,
          fileName: doc.fileName,
          success: false,
          error: error.message || 'Classification failed',
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const remaining = totalUnclassified.length - unclassifiedDocs.length;

    // Update queue status for processed documents
    // Mark successfully classified documents as completed in the queue
    const successfulDocIds = results.filter(r => r.success).map(r => r.documentId);
    const failedDocIds = results.filter(r => !r.success).map(r => r.documentId);

    if (successfulDocIds.length > 0) {
      await db
        .update(documentProcessingQueueTable)
        .set({
          status: QUEUE_STATUS.COMPLETED,
          completedAt: new Date(),
        })
        .where(inArray(documentProcessingQueueTable.documentId, successfulDocIds));
    }

    if (failedDocIds.length > 0) {
      await db
        .update(documentProcessingQueueTable)
        .set({
          status: QUEUE_STATUS.FAILED,
          errorMessage: 'Classification failed via direct analysis',
        })
        .where(inArray(documentProcessingQueueTable.documentId, failedDocIds));
    }

    // Only continue if we had at least one success
    // If all documents in this batch failed, stop the loop to prevent infinite retries
    const hasMore = remaining > 0 && successful > 0;

    return NextResponse.json({
      success: true,
      message: `Processed ${successful} of ${unclassifiedDocs.length} documents`,
      processed: unclassifiedDocs.length,
      successful,
      failed,
      remaining,
      hasMore,
      allFailed: failed > 0 && successful === 0,
      results,
    });
  } catch (error: any) {
    console.error('[AnalyzeDocs] Error:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to analyze documents' },
      { status: 500 }
    );
  }
}
