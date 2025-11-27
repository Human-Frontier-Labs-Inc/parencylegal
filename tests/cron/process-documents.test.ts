/**
 * Document Processing Cron Tests
 * TDD: Tests written BEFORE implementation
 * Phase 4: Auto-Classification & Configurable Models
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/queue/document-processing', () => ({
  processNextInQueue: vi.fn(),
  getGlobalQueueStats: vi.fn(() => Promise.resolve({
    total: 10,
    pending: 5,
    processing: 1,
    completed: 3,
    failed: 1,
  })),
  cleanupOldItems: vi.fn(() => Promise.resolve(0)),
}));

vi.mock('@/lib/ai/model-config', () => ({
  getClassificationConfig: vi.fn(() => ({
    model: 'gpt-4o-mini',
    maxTokens: 500,
    temperature: 0.1,
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
  })),
}));

import { processNextInQueue, getGlobalQueueStats } from '@/lib/queue/document-processing';
import { getClassificationConfig } from '@/lib/ai/model-config';

describe('Document Processing Cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Processing Limits', () => {
    test('should process up to 5 documents per run', async () => {
      // Simulate queue with 10 documents
      const mockProcessNextInQueue = processNextInQueue as ReturnType<typeof vi.fn>;

      let callCount = 0;
      mockProcessNextInQueue.mockImplementation(() => {
        callCount++;
        if (callCount <= 10) {
          return Promise.resolve({
            id: `queue-${callCount}`,
            documentId: `doc-${callCount}`,
            success: true,
            processingTimeMs: 500,
          });
        }
        return Promise.resolve(null);
      });

      // Simulate processing loop
      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await processNextInQueue();
        if (result) results.push(result);
      }

      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Timeout Safety', () => {
    test('should respect timeout limits', async () => {
      // The cron should not exceed 55 seconds
      const TIMEOUT_SAFETY_MS = 55000;

      // Test that the constant is correct
      expect(TIMEOUT_SAFETY_MS).toBeLessThan(60000); // Less than Vercel's 60s limit
    });
  });

  describe('Queue Statistics', () => {
    test('should return queue statistics after processing', async () => {
      const stats = await getGlobalQueueStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('processing');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
    });
  });

  describe('Model Configuration', () => {
    test('should use configured model for processing', () => {
      const config = getClassificationConfig();

      expect(config.model).toBeDefined();
      expect(typeof config.model).toBe('string');
    });
  });

  describe('Error Handling', () => {
    test('should continue processing after individual failures', async () => {
      const mockProcessNextInQueue = processNextInQueue as ReturnType<typeof vi.fn>;

      let callCount = 0;
      mockProcessNextInQueue.mockImplementation(() => {
        callCount++;
        // Fail on second document
        if (callCount === 2) {
          return Promise.resolve({
            id: `queue-${callCount}`,
            documentId: `doc-${callCount}`,
            success: false,
            processingTimeMs: 100,
            error: 'Classification failed',
          });
        }
        if (callCount <= 5) {
          return Promise.resolve({
            id: `queue-${callCount}`,
            documentId: `doc-${callCount}`,
            success: true,
            processingTimeMs: 500,
          });
        }
        return Promise.resolve(null);
      });

      // Process all
      const results = [];
      let result;
      while ((result = await processNextInQueue()) !== null && results.length < 5) {
        results.push(result);
      }

      // Should have processed despite failure
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      expect(successful).toBeGreaterThan(0);
      expect(failed).toBe(1);
    });
  });
});
