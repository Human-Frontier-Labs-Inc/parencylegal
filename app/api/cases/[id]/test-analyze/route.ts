/**
 * Test Analyze Documents API
 * Diagnostic endpoint to see what documents would be processed
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { casesTable, documentsTable } from '@/db/schema';
import { documentProcessingQueueTable } from '@/db/schema/document-processing-queue-schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: caseId } = await params;

    // Verify case belongs to user
    const [caseRecord] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)))
      .limit(1);

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Get ALL documents for case
    const allDocs = await db
      .select({
        id: documentsTable.id,
        fileName: documentsTable.fileName,
        category: documentsTable.category,
        subtype: documentsTable.subtype,
        confidence: documentsTable.confidence,
        storagePath: documentsTable.storagePath,
        fileType: documentsTable.fileType,
        createdAt: documentsTable.createdAt,
      })
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.caseId, caseId),
          eq(documentsTable.userId, userId)
        )
      );

    // Get unclassified documents (what analyze-documents would process)
    const unclassifiedDocs = await db
      .select({
        id: documentsTable.id,
        fileName: documentsTable.fileName,
        category: documentsTable.category,
      })
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.caseId, caseId),
          eq(documentsTable.userId, userId),
          isNull(documentsTable.category)
        )
      );

    // Get queue status
    const queueItems = await db
      .select()
      .from(documentProcessingQueueTable)
      .where(eq(documentProcessingQueueTable.caseId, caseId));

    const queueStats = {
      total: queueItems.length,
      pending: queueItems.filter(i => i.status === 'pending').length,
      processing: queueItems.filter(i => i.status === 'processing').length,
      completed: queueItems.filter(i => i.status === 'completed').length,
      failed: queueItems.filter(i => i.status === 'failed').length,
    };

    // Check for documents in queue that are NOT in documents table
    const docIds = allDocs.map(d => d.id);
    const orphanedQueueItems = queueItems.filter(q => !docIds.includes(q.documentId));

    return NextResponse.json({
      caseId,
      caseName: caseRecord.name,
      documents: {
        total: allDocs.length,
        classified: allDocs.filter(d => d.category !== null).length,
        unclassified: unclassifiedDocs.length,
        list: allDocs.map(d => ({
          id: d.id,
          fileName: d.fileName,
          category: d.category,
          hasStoragePath: !!d.storagePath,
          fileType: d.fileType,
        })),
      },
      queue: {
        stats: queueStats,
        items: queueItems.map(q => ({
          id: q.id,
          documentId: q.documentId,
          status: q.status,
          attempts: q.attempts,
          errorMessage: q.errorMessage,
          createdAt: q.createdAt,
        })),
        orphanedItems: orphanedQueueItems.length,
      },
      wouldProcess: unclassifiedDocs.map(d => ({
        id: d.id,
        fileName: d.fileName,
      })),
      diagnosis: {
        hasUnclassifiedDocs: unclassifiedDocs.length > 0,
        hasPendingQueueItems: queueStats.pending > 0,
        queueMatchesUnclassified: queueStats.pending === unclassifiedDocs.length,
        issue: unclassifiedDocs.length === 0
          ? 'All documents are already classified'
          : queueStats.pending > 0 && unclassifiedDocs.length === 0
            ? 'Queue has items but no unclassified docs - mismatch'
            : 'Documents ready to be processed',
      },
    });
  } catch (error: any) {
    console.error('[TestAnalyze] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
