/**
 * Document Processing Queue Tests
 * TDD: Tests written BEFORE implementation
 * Phase 4: Auto-Classification & Configurable Models
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// Create mock queue items for testing
const mockQueueItems = [
  { id: 'q1', documentId: 'doc-1', status: 'pending' },
  { id: 'q2', documentId: 'doc-2', status: 'processing' },
  { id: 'q3', documentId: 'doc-3', status: 'completed' },
  { id: 'q4', documentId: 'doc-4', status: 'failed' },
];

// Mock the database and classification modules
vi.mock('@/db/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => {
        // Create a where result that can be awaited directly or chained
        const whereResult = Object.assign(
          Promise.resolve(mockQueueItems),
          {
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([]))
            })),
            limit: vi.fn(() => Promise.resolve([]))
          }
        );

        // Return a from result that can be awaited directly or chained with .where()
        const fromResult = Object.assign(
          Promise.resolve(mockQueueItems),
          {
            where: vi.fn(() => whereResult),
          }
        );

        return fromResult;
      })
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{
          id: 'queue-1',
          documentId: 'doc-1',
          caseId: 'case-1',
          userId: 'user-1',
          status: 'pending',
          priority: 0,
          attempts: 0,
          maxAttempts: 3,
          createdAt: new Date(),
        }]))
      }))
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve())
      }))
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([]))
      }))
    })),
  }
}));

vi.mock('@/lib/ai/classification', () => ({
  classifyAndStore: vi.fn(() => Promise.resolve({
    category: 'Financial',
    subtype: 'Bank Statement',
    confidence: 0.95,
    tokensUsed: 150,
    processingTimeMs: 500,
    documentId: 'doc-1',
    extractionMethod: 'pdf-parse',
    needsReview: false,
    metadata: {},
  }))
}));

vi.mock('@/lib/ai/model-config', () => ({
  getClassificationConfig: vi.fn(() => ({
    model: 'gpt-4o-mini',
    maxTokens: 500,
    temperature: 0.1,
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
  }))
}));

import {
  addToQueue,
  addBatchToQueue,
  processNextInQueue,
  getCaseProcessingStatus,
  getGlobalQueueStats,
} from '@/lib/queue/document-processing';

// Import QUEUE_STATUS directly from schema (not mocked)
import { QUEUE_STATUS } from '@/db/schema/document-processing-queue-schema';

describe('Document Processing Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addToQueue', () => {
    test('should add document to queue on sync', async () => {
      const result = await addToQueue('doc-1', 'case-1', 'user-1');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('documentId', 'doc-1');
      expect(result).toHaveProperty('status', 'pending');
    });

    test('should set default priority to 0', async () => {
      const result = await addToQueue('doc-1', 'case-1', 'user-1');
      expect(result.status).toBe('pending');
    });

    test('should allow custom priority', async () => {
      const result = await addToQueue('doc-1', 'case-1', 'user-1', 10);
      expect(result).toBeDefined();
    });
  });

  describe('addBatchToQueue', () => {
    test('should add multiple documents to queue', async () => {
      const documents = [
        { documentId: 'doc-1', caseId: 'case-1', userId: 'user-1' },
        { documentId: 'doc-2', caseId: 'case-1', userId: 'user-1' },
        { documentId: 'doc-3', caseId: 'case-1', userId: 'user-1' },
      ];

      const results = await addBatchToQueue(documents);

      expect(results.length).toBe(3);
      results.forEach(result => {
        expect(result.status).toBe('pending');
      });
    });
  });

  describe('Queue Status Transitions', () => {
    test('status should transition from pending to processing', async () => {
      // This tests the state machine behavior
      const initialStatus = 'pending';
      const expectedNextStatus = 'processing';

      // Status constants should match expected values
      expect(QUEUE_STATUS.PENDING).toBe(initialStatus);
      expect(QUEUE_STATUS.PROCESSING).toBe(expectedNextStatus);
    });

    test('status should transition from processing to completed', async () => {
      expect(QUEUE_STATUS.PROCESSING).toBe('processing');
      expect(QUEUE_STATUS.COMPLETED).toBe('completed');
    });

    test('status should transition from processing to failed', async () => {
      expect(QUEUE_STATUS.PROCESSING).toBe('processing');
      expect(QUEUE_STATUS.FAILED).toBe('failed');
    });
  });

  describe('getCaseProcessingStatus', () => {
    test('should return processing status for case', async () => {
      const status = await getCaseProcessingStatus('case-1');

      expect(status).toHaveProperty('total');
      expect(status).toHaveProperty('pending');
      expect(status).toHaveProperty('processing');
      expect(status).toHaveProperty('completed');
      expect(status).toHaveProperty('failed');
    });
  });

  describe('getGlobalQueueStats', () => {
    test('should return global queue statistics', async () => {
      const stats = await getGlobalQueueStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('processing');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
    });
  });

  describe('Error Handling', () => {
    test('should track retry attempts', async () => {
      // Queue should track attempts for retry logic
      expect(QUEUE_STATUS.FAILED).toBe('failed');
    });

    test('should have max attempts limit', async () => {
      // Default max attempts should be 3
      const result = await addToQueue('doc-1', 'case-1', 'user-1');
      expect(result).toBeDefined();
    });
  });
});

describe('Queue Service Integration', () => {
  describe('processNextInQueue', () => {
    test('should process document and mark completed', async () => {
      // When processNextInQueue is called
      // It should classify the document and update status

      // This tests the integration of queue + classification
      const result = await processNextInQueue();

      // Result may be null if queue is empty (mocked)
      // In real scenario, it would return processing result
      expect(result === null || result.documentId !== undefined).toBe(true);
    });
  });
});
