/**
 * AI Model Configuration
 * Environment-driven model selection for different use cases
 * Phase 4: Auto-Classification & Configurable Models
 */

export interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  inputCostPer1k: number;  // Cost in dollars per 1K tokens
  outputCostPer1k: number;
}

export interface ModelConfigs {
  classification: ModelConfig;
  chat: ModelConfig;
  embedding: EmbeddingModelConfig;
}

export interface EmbeddingModelConfig {
  model: string;
  dimensions: number;
  costPer1k: number;
}

// Default model configurations
const DEFAULT_MODELS: ModelConfigs = {
  classification: {
    model: 'gpt-4o-mini',
    maxTokens: 500,
    temperature: 0.1,
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
  },
  chat: {
    model: 'gpt-4o-mini',
    maxTokens: 2000,
    temperature: 0.7,
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
  },
  embedding: {
    model: 'text-embedding-3-large',
    dimensions: 3072,
    costPer1k: 0.00013,
  },
};

// Model pricing lookup (per 1K tokens in dollars)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // GPT-4o family
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },

  // GPT-5 family (hypothetical - will update when available)
  'gpt-5': { input: 0.01, output: 0.03 },
  'gpt-5-mini': { input: 0.001, output: 0.003 },
  'gpt-5-nano': { input: 0.0003, output: 0.0012 },

  // Fallback for unknown models
  'default': { input: 0.001, output: 0.003 },
};

// Embedding model pricing (per 1K tokens)
const EMBEDDING_PRICING: Record<string, number> = {
  'text-embedding-3-large': 0.00013,
  'text-embedding-3-small': 0.00002,
  'text-embedding-ada-002': 0.0001,
  'default': 0.0001,
};

/**
 * Get classification model from environment or default
 */
export function getClassificationModel(): string {
  return process.env.OPENAI_MODEL_CLASSIFICATION || DEFAULT_MODELS.classification.model;
}

/**
 * Get chat model from environment or default
 */
export function getChatModel(): string {
  return process.env.OPENAI_MODEL_CHAT || DEFAULT_MODELS.chat.model;
}

/**
 * Get embedding model from environment or default
 */
export function getEmbeddingModel(): string {
  return process.env.OPENAI_MODEL_EMBEDDING || DEFAULT_MODELS.embedding.model;
}

/**
 * Get full configuration for classification
 */
export function getClassificationConfig(): ModelConfig {
  const model = getClassificationModel();
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['default'];

  return {
    model,
    maxTokens: parseInt(process.env.OPENAI_CLASSIFICATION_MAX_TOKENS || '500', 10),
    temperature: parseFloat(process.env.OPENAI_CLASSIFICATION_TEMPERATURE || '0.1'),
    inputCostPer1k: pricing.input,
    outputCostPer1k: pricing.output,
  };
}

/**
 * Get full configuration for chat
 */
export function getChatConfig(): ModelConfig {
  const model = getChatModel();
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['default'];

  return {
    model,
    maxTokens: parseInt(process.env.OPENAI_CHAT_MAX_TOKENS || '2000', 10),
    temperature: parseFloat(process.env.OPENAI_CHAT_TEMPERATURE || '0.7'),
    inputCostPer1k: pricing.input,
    outputCostPer1k: pricing.output,
  };
}

/**
 * Get full configuration for embeddings
 */
export function getEmbeddingConfig(): EmbeddingModelConfig {
  const model = getEmbeddingModel();
  const dimensions = model === 'text-embedding-3-small' ? 1536 : 3072;

  return {
    model,
    dimensions,
    costPer1k: EMBEDDING_PRICING[model] || EMBEDDING_PRICING['default'],
  };
}

/**
 * Calculate cost in cents for given token usage
 */
export function calculateCostCents(
  inputTokens: number,
  outputTokens: number,
  config: ModelConfig
): number {
  const inputCost = (inputTokens / 1000) * config.inputCostPer1k;
  const outputCost = (outputTokens / 1000) * config.outputCostPer1k;
  const totalDollars = inputCost + outputCost;
  // Convert to cents and round to integer
  return Math.round(totalDollars * 100);
}

/**
 * Calculate embedding cost in cents
 */
export function calculateEmbeddingCostCents(
  tokens: number,
  config: EmbeddingModelConfig
): number {
  const costDollars = (tokens / 1000) * config.costPer1k;
  return Math.round(costDollars * 100);
}

/**
 * Get all model configurations
 */
export function getAllModelConfigs(): ModelConfigs {
  return {
    classification: getClassificationConfig(),
    chat: getChatConfig(),
    embedding: getEmbeddingConfig(),
  };
}

/**
 * Validate that a model name is supported
 */
export function isModelSupported(model: string): boolean {
  return model in MODEL_PRICING || model.startsWith('gpt-');
}

/**
 * Get model display name for UI
 */
export function getModelDisplayName(model: string): string {
  const displayNames: Record<string, string> = {
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-5': 'GPT-5',
    'gpt-5-mini': 'GPT-5 Mini',
    'gpt-5-nano': 'GPT-5 Nano',
    'text-embedding-3-large': 'Embeddings Large',
    'text-embedding-3-small': 'Embeddings Small',
  };
  return displayNames[model] || model;
}
