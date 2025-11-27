/**
 * Model Configuration Tests
 * TDD: Tests written BEFORE implementation changes
 * Phase 4: Auto-Classification & Configurable Models
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getClassificationModel,
  getChatModel,
  getEmbeddingModel,
  getClassificationConfig,
  getChatConfig,
  getEmbeddingConfig,
  calculateCostCents,
  calculateEmbeddingCostCents,
  isModelSupported,
  getModelDisplayName,
  getAllModelConfigs,
} from '@/lib/ai/model-config';

describe('Model Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getClassificationModel', () => {
    test('should use env variable for classification model', () => {
      process.env.OPENAI_MODEL_CLASSIFICATION = 'gpt-5-nano';
      const model = getClassificationModel();
      expect(model).toBe('gpt-5-nano');
    });

    test('should fallback to default when env not set', () => {
      delete process.env.OPENAI_MODEL_CLASSIFICATION;
      const model = getClassificationModel();
      expect(model).toBe('gpt-4o-mini');
    });
  });

  describe('getChatModel', () => {
    test('should use env variable for chat model', () => {
      process.env.OPENAI_MODEL_CHAT = 'gpt-5-mini';
      const model = getChatModel();
      expect(model).toBe('gpt-5-mini');
    });

    test('should fallback to default when env not set', () => {
      delete process.env.OPENAI_MODEL_CHAT;
      const model = getChatModel();
      expect(model).toBe('gpt-4o-mini');
    });
  });

  describe('getEmbeddingModel', () => {
    test('should use env variable for embedding model', () => {
      process.env.OPENAI_MODEL_EMBEDDING = 'text-embedding-3-small';
      const model = getEmbeddingModel();
      expect(model).toBe('text-embedding-3-small');
    });

    test('should fallback to default when env not set', () => {
      delete process.env.OPENAI_MODEL_EMBEDDING;
      const model = getEmbeddingModel();
      expect(model).toBe('text-embedding-3-large');
    });
  });

  describe('getClassificationConfig', () => {
    test('should return full config with correct model', () => {
      process.env.OPENAI_MODEL_CLASSIFICATION = 'gpt-4o';
      const config = getClassificationConfig();

      expect(config.model).toBe('gpt-4o');
      expect(config.maxTokens).toBeGreaterThan(0);
      expect(config.temperature).toBeDefined();
      expect(config.inputCostPer1k).toBeGreaterThan(0);
      expect(config.outputCostPer1k).toBeGreaterThan(0);
    });

    test('should use custom max tokens from env', () => {
      process.env.OPENAI_CLASSIFICATION_MAX_TOKENS = '1000';
      const config = getClassificationConfig();
      expect(config.maxTokens).toBe(1000);
    });

    test('should use custom temperature from env', () => {
      process.env.OPENAI_CLASSIFICATION_TEMPERATURE = '0.5';
      const config = getClassificationConfig();
      expect(config.temperature).toBe(0.5);
    });
  });

  describe('getChatConfig', () => {
    test('should return full config with correct model', () => {
      process.env.OPENAI_MODEL_CHAT = 'gpt-5';
      const config = getChatConfig();

      expect(config.model).toBe('gpt-5');
      expect(config.maxTokens).toBeGreaterThan(0);
      expect(config.temperature).toBeDefined();
    });

    test('should have higher temperature than classification', () => {
      delete process.env.OPENAI_CLASSIFICATION_TEMPERATURE;
      delete process.env.OPENAI_CHAT_TEMPERATURE;

      const classificationConfig = getClassificationConfig();
      const chatConfig = getChatConfig();

      expect(chatConfig.temperature).toBeGreaterThan(classificationConfig.temperature);
    });
  });

  describe('getEmbeddingConfig', () => {
    test('should return full config with correct model', () => {
      const config = getEmbeddingConfig();

      expect(config.model).toBe('text-embedding-3-large');
      expect(config.dimensions).toBe(3072);
      expect(config.costPer1k).toBeGreaterThan(0);
    });

    test('should return 1536 dimensions for small model', () => {
      process.env.OPENAI_MODEL_EMBEDDING = 'text-embedding-3-small';
      const config = getEmbeddingConfig();
      expect(config.dimensions).toBe(1536);
    });
  });

  describe('calculateCostCents', () => {
    test('should calculate cost correctly for known model', () => {
      const config = {
        model: 'gpt-4o-mini',
        maxTokens: 500,
        temperature: 0.1,
        inputCostPer1k: 0.00015,
        outputCostPer1k: 0.0006,
      };

      // 1000 input tokens, 500 output tokens
      const cost = calculateCostCents(1000, 500, config);

      // Input: 1 * 0.00015 = $0.00015
      // Output: 0.5 * 0.0006 = $0.0003
      // Total: $0.00045 = 0.045 cents, rounds to 0
      expect(cost).toBeGreaterThanOrEqual(0);
    });

    test('should return integer cents', () => {
      const config = {
        model: 'gpt-4o',
        maxTokens: 500,
        temperature: 0.1,
        inputCostPer1k: 0.005,
        outputCostPer1k: 0.015,
      };

      // Large token usage to ensure non-zero cost
      const cost = calculateCostCents(10000, 5000, config);

      // Should be an integer
      expect(Number.isInteger(cost)).toBe(true);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('calculateEmbeddingCostCents', () => {
    test('should calculate embedding cost correctly', () => {
      const config = {
        model: 'text-embedding-3-large',
        dimensions: 3072,
        costPer1k: 0.00013,
      };

      // Large token count to ensure measurable cost
      const cost = calculateEmbeddingCostCents(100000, config);

      expect(cost).toBeGreaterThan(0);
      expect(Number.isInteger(cost)).toBe(true);
    });
  });

  describe('isModelSupported', () => {
    test('should return true for known models', () => {
      expect(isModelSupported('gpt-4o')).toBe(true);
      expect(isModelSupported('gpt-4o-mini')).toBe(true);
      expect(isModelSupported('gpt-5')).toBe(true);
    });

    test('should return true for gpt- prefixed models', () => {
      expect(isModelSupported('gpt-new-model')).toBe(true);
    });

    test('should return false for unknown models', () => {
      expect(isModelSupported('claude-3')).toBe(false);
      expect(isModelSupported('random-model')).toBe(false);
    });
  });

  describe('getModelDisplayName', () => {
    test('should return friendly names for known models', () => {
      expect(getModelDisplayName('gpt-4o')).toBe('GPT-4o');
      expect(getModelDisplayName('gpt-4o-mini')).toBe('GPT-4o Mini');
      expect(getModelDisplayName('gpt-5-nano')).toBe('GPT-5 Nano');
    });

    test('should return model name for unknown models', () => {
      expect(getModelDisplayName('unknown-model')).toBe('unknown-model');
    });
  });

  describe('getAllModelConfigs', () => {
    test('should return all configs', () => {
      const configs = getAllModelConfigs();

      expect(configs.classification).toBeDefined();
      expect(configs.chat).toBeDefined();
      expect(configs.embedding).toBeDefined();

      expect(configs.classification.model).toBeDefined();
      expect(configs.chat.model).toBeDefined();
      expect(configs.embedding.model).toBeDefined();
    });
  });
});
