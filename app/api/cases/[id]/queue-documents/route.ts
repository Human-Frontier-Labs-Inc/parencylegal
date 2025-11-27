/**
 * Queue Documents for Processing API
 * Adds all unprocessed documents in a case to the classification queue
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { casesTable, documentsTable } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { addToQueue, getCaseProcessingStatus } from '@/lib/queue/document-processing';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    // Get all documents without classification
    const unclassifiedDocs = await db
      .select({ id: documentsTable.id, fileName: documentsTable.fileName })
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.caseId, caseId),
          isNull(documentsTable.category)
        )
      );

    if (unclassifiedDocs.length === 0) {
      // Check current queue status
      const status = await getCaseProcessingStatus(caseId);

      return NextResponse.json({
        success: true,
        message: 'All documents already classified or in queue',
        queued: 0,
        queueStatus: status,
      });
    }

    // Add all to queue
    let queuedCount = 0;
    const errors: string[] = [];

    for (const doc of unclassifiedDocs) {
      try {
        await addToQueue(doc.id, caseId, userId, 0);
        queuedCount++;
      } catch (error: any) {
        errors.push(`${doc.fileName}: ${error.message}`);
      }
    }

    // Get updated queue status
    const status = await getCaseProcessingStatus(caseId);

    return NextResponse.json({
      success: true,
      message: `Queued ${queuedCount} documents for processing`,
      queued: queuedCount,
      total: unclassifiedDocs.length,
      errors: errors.length > 0 ? errors : undefined,
      queueStatus: status,
    });
  } catch (error: any) {
    console.error('[QueueDocuments] Error:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to queue documents' },
      { status: 500 }
    );
  }
}
