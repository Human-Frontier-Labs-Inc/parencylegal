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

// Default model configurations (Updated Nov 2025 for GPT-5 family)
const DEFAULT_MODELS: ModelConfigs = {
  classification: {
    model: 'gpt-5-nano',  // Best for classification - fast and cheap
    maxTokens: 2000,  // Increased from 500 - GPT-5 models need buffer for reasoning overhead
    temperature: 0.1,
    inputCostPer1k: 0.00005,  // $0.05 per 1M tokens
    outputCostPer1k: 0.0004,  // $0.40 per 1M tokens
  },
  chat: {
    model: 'gpt-5-mini',  // Best for legal assistant - balanced performance
    maxTokens: 2000,
    temperature: 0.7,
    inputCostPer1k: 0.00025,  // $0.25 per 1M tokens
    outputCostPer1k: 0.002,   // $2.00 per 1M tokens
  },
  embedding: {
    model: 'text-embedding-3-small',  // 90% cheaper than large, sufficient for RAG
    dimensions: 1536,
    costPer1k: 0.00002,  // $0.02 per 1M tokens
  },
};

// Model pricing lookup (per 1K tokens in dollars) - Updated Nov 2025
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // GPT-5 family (Released Aug 2025)
  'gpt-5-pro': { input: 0.015, output: 0.12 },      // $15/$120 per 1M
  'gpt-5.1': { input: 0.00125, output: 0.01 },      // $1.25/$10 per 1M
  'gpt-5': { input: 0.00125, output: 0.01 },        // $1.25/$10 per 1M
  'gpt-5-mini': { input: 0.00025, output: 0.002 },  // $0.25/$2 per 1M
  'gpt-5-nano': { input: 0.00005, output: 0.0004 }, // $0.05/$0.40 per 1M

  // GPT-4 family (Legacy)
  'gpt-4o': { input: 0.0025, output: 0.01 },        // $2.50/$10 per 1M
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },// $0.15/$0.60 per 1M
  'gpt-4.1': { input: 0.002, output: 0.008 },       // $2/$8 per 1M
  'gpt-4.1-mini': { input: 0.0004, output: 0.0016 },// $0.40/$1.60 per 1M

  // Reasoning models (o-series)
  'o1': { input: 0.015, output: 0.06 },             // $15/$60 per 1M
  'o1-mini': { input: 0.0011, output: 0.0044 },     // $1.10/$4.40 per 1M
  'o3': { input: 0.002, output: 0.008 },            // $2/$8 per 1M
  'o3-mini': { input: 0.0011, output: 0.0044 },     // $1.10/$4.40 per 1M

  // Fallback for unknown models
  'default': { input: 0.00025, output: 0.002 },
};

// Embedding model pricing (per 1K tokens) - Updated Nov 2025
const EMBEDDING_PRICING: Record<string, number> = {
  'text-embedding-3-small': 0.00002,  // $0.02 per 1M - RECOMMENDED
  'text-embedding-3-large': 0.00013,  // $0.13 per 1M
  'text-embedding-ada-002': 0.0001,   // $0.10 per 1M (legacy)
  'default': 0.00002,
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
    // GPT-5 family
    'gpt-5-pro': 'GPT-5 Pro',
    'gpt-5.1': 'GPT-5.1',
    'gpt-5': 'GPT-5',
    'gpt-5-mini': 'GPT-5 Mini',
    'gpt-5-nano': 'GPT-5 Nano',
    // GPT-4 family
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4.1': 'GPT-4.1',
    'gpt-4.1-mini': 'GPT-4.1 Mini',
    // Reasoning models
    'o1': 'o1',
    'o1-mini': 'o1 Mini',
    'o3': 'o3',
    'o3-mini': 'o3 Mini',
    // Embeddings
    'text-embedding-3-large': 'Embeddings Large',
    'text-embedding-3-small': 'Embeddings Small',
  };
  return displayNames[model] || model;
}
