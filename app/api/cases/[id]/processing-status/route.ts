/**
 * Case Processing Status API
 * Phase 4: Auto-Classification & Configurable Models
 *
 * Returns classification processing status for a case
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { casesTable } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCaseProcessingStatus } from '@/lib/queue/document-processing';
import { getClassificationStats } from '@/lib/ai/classification';

export async function GET(
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

    // Get queue status
    const queueStatus = await getCaseProcessingStatus(caseId);

    // Get classification stats
    const classificationStats = await getClassificationStats(caseId);

    // Combine into a comprehensive status
    const isProcessing = queueStatus.pending > 0 || queueStatus.processing > 0;
    const progress = queueStatus.total > 0
      ? Math.round((queueStatus.completed / queueStatus.total) * 100)
      : 100;

    return NextResponse.json({
      caseId,
      isProcessing,
      progress,
      queue: queueStatus,
      classification: classificationStats,
      message: isProcessing
        ? `Classifying ${queueStatus.pending + queueStatus.processing} of ${queueStatus.total} documents...`
        : queueStatus.total > 0
          ? `Classification complete: ${queueStatus.completed} documents processed`
          : 'No documents queued for classification',
    });
  } catch (error: any) {
    console.error('[ProcessingStatus] Error:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to get processing status' },
      { status: 500 }
    );
  }
}
