/**
 * Document Processing Cron Job
 * Phase 4: Auto-Classification & Configurable Models
 *
 * Runs every minute to process queued documents
 * Vercel Cron: /api/cron/process-documents
 */

import { NextResponse } from 'next/server';
import {
  processNextInQueue,
  getGlobalQueueStats,
  cleanupOldItems,
} from '@/lib/queue/document-processing';
import { getClassificationConfig } from '@/lib/ai/model-config';

// Constants
const MAX_DOCS_PER_RUN = 5; // Process up to 5 documents per cron run
const TIMEOUT_SAFETY_MS = 55000; // Stop 5 seconds before Vercel's 60s timeout

// Verify cron secret (Vercel sets CRON_SECRET for authenticated cron jobs)
function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const vercelCronHeader = request.headers.get('x-vercel-cron');

  // In development, allow without auth
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // Check for Vercel's internal cron header (set by Vercel when using vercel.json cron)
  if (vercelCronHeader === '1') {
    return true;
  }

  // Check for CRON_SECRET if configured
  if (process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }

  // Allow if request comes from Vercel's infrastructure (check user-agent)
  const userAgent = request.headers.get('user-agent') || '';
  if (userAgent.includes('vercel-cron')) {
    return true;
  }

  // For production without CRON_SECRET, allow internal requests
  // This is safe because the endpoint only processes the queue - no destructive actions
  // In a real production system, you'd want to set CRON_SECRET in Vercel env vars
  if (!process.env.CRON_SECRET && process.env.VERCEL === '1') {
    console.log('[Cron] Warning: No CRON_SECRET set, allowing request from Vercel');
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  // Verify this is an authorized cron request
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  const results: Array<{
    documentId: string;
    success: boolean;
    processingTimeMs: number;
    error?: string;
  }> = [];

  let processed = 0;
  let successful = 0;
  let failed = 0;

  // Get model info for logging
  const modelConfig = getClassificationConfig();

  console.log(`[Cron] Starting document processing job`);
  console.log(`[Cron] Using model: ${modelConfig.model}`);

  try {
    // Process documents until we hit limits
    while (processed < MAX_DOCS_PER_RUN) {
      // Check timeout safety
      const elapsed = Date.now() - startTime;
      if (elapsed > TIMEOUT_SAFETY_MS) {
        console.log(`[Cron] Timeout safety reached after ${elapsed}ms`);
        break;
      }

      // Process next document
      const result = await processNextInQueue();

      // No more documents to process
      if (!result) {
        console.log('[Cron] Queue empty, no more documents to process');
        break;
      }

      processed++;
      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      results.push({
        documentId: result.documentId,
        success: result.success,
        processingTimeMs: result.processingTimeMs,
        error: result.error,
      });

      console.log(
        `[Cron] Processed document ${result.documentId}: ${result.success ? 'success' : 'failed'} (${result.processingTimeMs}ms)`
      );
    }

    // Cleanup old completed/failed items (once per hour-ish)
    const hourMarker = new Date().getMinutes();
    if (hourMarker === 0) {
      const cleaned = await cleanupOldItems(7);
      console.log(`[Cron] Cleaned up ${cleaned} old queue items`);
    }

    // Get final queue stats
    const stats = await getGlobalQueueStats();
    const totalTime = Date.now() - startTime;

    console.log(`[Cron] Job completed: ${processed} processed, ${successful} successful, ${failed} failed in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      processed,
      successful,
      failed,
      totalTimeMs: totalTime,
      model: modelConfig.model,
      queueStats: stats,
      results,
    });
  } catch (error: any) {
    console.error('[Cron] Job failed with error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
        processed,
        successful,
        failed,
        totalTimeMs: Date.now() - startTime,
        results,
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: Request) {
  return GET(request);
}
