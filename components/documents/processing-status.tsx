'use client';

/**
 * Document Processing Status Component
 * Phase 4: Auto-Classification & Configurable Models
 *
 * Displays real-time classification progress for a case
 */

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface ProcessingStatusProps {
  caseId: string;
  onComplete?: () => void;
  pollingInterval?: number; // in ms, default 5000
}

interface ProcessingData {
  caseId: string;
  isProcessing: boolean;
  progress: number;
  queue: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  classification: {
    total: number;
    classified: number;
    needsReview: number;
    byCategory: Record<string, number>;
    averageConfidence: number;
  };
  message: string;
}

export function ProcessingStatus({
  caseId,
  onComplete,
  pollingInterval = 5000,
}: ProcessingStatusProps) {
  const [status, setStatus] = useState<ProcessingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/cases/${caseId}/processing-status`);
        if (!response.ok) {
          throw new Error('Failed to fetch status');
        }
        const data = await response.json();

        if (mounted) {
          setStatus(data);
          setError(null);
          setIsLoading(false);

          // Stop polling if processing is complete
          if (!data.isProcessing && intervalId) {
            clearInterval(intervalId);
            intervalId = null;
            onComplete?.();
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    };

    // Initial fetch
    fetchStatus();

    // Start polling if we don't have status yet or if processing
    intervalId = setInterval(fetchStatus, pollingInterval);

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [caseId, pollingInterval, onComplete]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading status...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const { isProcessing, progress, queue, message } = status;

  // Don't show anything if there's nothing in the queue
  if (queue.total === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="font-medium">Classification in Progress</span>
            </>
          ) : queue.failed > 0 ? (
            <>
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <span className="font-medium">Classification Complete (with errors)</span>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium">Classification Complete</span>
            </>
          )}
        </div>
        <span className="text-sm text-muted-foreground">{progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isProcessing
              ? 'bg-primary'
              : queue.failed > 0
                ? 'bg-amber-500'
                : 'bg-green-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{message}</span>
        <div className="flex items-center gap-3">
          {queue.completed > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              {queue.completed}
            </span>
          )}
          {queue.pending + queue.processing > 0 && (
            <span className="flex items-center gap-1 text-primary">
              <Clock className="h-3 w-3" />
              {queue.pending + queue.processing}
            </span>
          )}
          {queue.failed > 0 && (
            <span className="flex items-center gap-1 text-amber-500">
              <AlertCircle className="h-3 w-3" />
              {queue.failed}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact version for inline use
export function ProcessingStatusBadge({ caseId }: { caseId: string }) {
  const [status, setStatus] = useState<ProcessingData | null>(null);

  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/cases/${caseId}/processing-status`);
        if (!response.ok) return;
        const data = await response.json();
        if (mounted) {
          setStatus(data);
          if (!data.isProcessing && intervalId) {
            clearInterval(intervalId);
          }
        }
      } catch {
        // Silently fail for badge
      }
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, 10000);

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [caseId]);

  if (!status || !status.isProcessing) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      <Loader2 className="h-3 w-3 animate-spin" />
      Classifying...
    </span>
  );
}
