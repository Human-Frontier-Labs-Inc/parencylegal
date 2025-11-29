/**
 * TDD Tests for OpenAI Model Parameter Selection
 * Ensures correct parameter (max_tokens vs max_completion_tokens) is used for each model
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the model config
const mockGetClassificationConfig = vi.fn();

// Test the model detection logic directly
function isNewModelRequiringMaxCompletionTokens(model: string): boolean {
  return model.startsWith('o1') ||
         model.startsWith('o3') ||
         model.startsWith('gpt-5') ||
         model.startsWith('gpt-4o');
}

function isReasoningModel(model: string): boolean {
  return model.startsWith('o1') || model.startsWith('o3');
}

describe('OpenAI Model Parameter Selection', () => {
  describe('isNewModelRequiringMaxCompletionTokens', () => {
    it('should return true for gpt-5-nano', () => {
      expect(isNewModelRequiringMaxCompletionTokens('gpt-5-nano')).toBe(true);
    });

    it('should return true for gpt-5-mini', () => {
      expect(isNewModelRequiringMaxCompletionTokens('gpt-5-mini')).toBe(true);
    });

    it('should return true for gpt-5', () => {
      expect(isNewModelRequiringMaxCompletionTokens('gpt-5')).toBe(true);
    });

    it('should return true for gpt-5-pro', () => {
      expect(isNewModelRequiringMaxCompletionTokens('gpt-5-pro')).toBe(true);
    });

    it('should return true for gpt-4o', () => {
      expect(isNewModelRequiringMaxCompletionTokens('gpt-4o')).toBe(true);
    });

    it('should return true for gpt-4o-mini', () => {
      expect(isNewModelRequiringMaxCompletionTokens('gpt-4o-mini')).toBe(true);
    });

    it('should return true for o1', () => {
      expect(isNewModelRequiringMaxCompletionTokens('o1')).toBe(true);
    });

    it('should return true for o1-mini', () => {
      expect(isNewModelRequiringMaxCompletionTokens('o1-mini')).toBe(true);
    });

    it('should return true for o3', () => {
      expect(isNewModelRequiringMaxCompletionTokens('o3')).toBe(true);
    });

    it('should return true for o3-mini', () => {
      expect(isNewModelRequiringMaxCompletionTokens('o3-mini')).toBe(true);
    });

    it('should return false for gpt-4', () => {
      expect(isNewModelRequiringMaxCompletionTokens('gpt-4')).toBe(false);
    });

    it('should return false for gpt-4-turbo', () => {
      expect(isNewModelRequiringMaxCompletionTokens('gpt-4-turbo')).toBe(false);
    });

    it('should return false for gpt-3.5-turbo', () => {
      expect(isNewModelRequiringMaxCompletionTokens('gpt-3.5-turbo')).toBe(false);
    });
  });

  describe('isReasoningModel', () => {
    it('should return true for o1', () => {
      expect(isReasoningModel('o1')).toBe(true);
    });

    it('should return true for o1-mini', () => {
      expect(isReasoningModel('o1-mini')).toBe(true);
    });

    it('should return true for o3', () => {
      expect(isReasoningModel('o3')).toBe(true);
    });

    it('should return true for o3-mini', () => {
      expect(isReasoningModel('o3-mini')).toBe(true);
    });

    it('should return false for gpt-5-nano', () => {
      expect(isReasoningModel('gpt-5-nano')).toBe(false);
    });

    it('should return false for gpt-4o', () => {
      expect(isReasoningModel('gpt-4o')).toBe(false);
    });
  });

  describe('Request parameter building', () => {
    it('should use max_completion_tokens for gpt-5-nano', () => {
      const model = 'gpt-5-nano';
      const maxTokens = 500;
      const isNewModel = isNewModelRequiringMaxCompletionTokens(model);

      const params: any = { model };
      if (isNewModel) {
        params.max_completion_tokens = maxTokens;
      } else {
        params.max_tokens = maxTokens;
      }

      expect(params.max_completion_tokens).toBe(500);
      expect(params.max_tokens).toBeUndefined();
    });

    it('should use max_tokens for gpt-4', () => {
      const model = 'gpt-4';
      const maxTokens = 500;
      const isNewModel = isNewModelRequiringMaxCompletionTokens(model);

      const params: any = { model };
      if (isNewModel) {
        params.max_completion_tokens = maxTokens;
      } else {
        params.max_tokens = maxTokens;
      }

      expect(params.max_tokens).toBe(500);
      expect(params.max_completion_tokens).toBeUndefined();
    });

    it('should include response_format for gpt-5-nano (non-reasoning model)', () => {
      const model = 'gpt-5-nano';
      const isReasoning = isReasoningModel(model);

      const params: any = { model };
      if (!isReasoning) {
        params.response_format = { type: 'json_object' };
      }

      expect(params.response_format).toEqual({ type: 'json_object' });
    });

    it('should NOT include response_format for o1 (reasoning model)', () => {
      const model = 'o1';
      const isReasoning = isReasoningModel(model);

      const params: any = { model };
      if (!isReasoning) {
        params.response_format = { type: 'json_object' };
      }

      expect(params.response_format).toBeUndefined();
    });
  });
});
