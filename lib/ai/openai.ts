/**
 * OpenAI Service
 * Handles AI-powered document classification using OpenAI API
 */

import OpenAI from 'openai';
import { db } from '@/db/db';
import { aiChatSessionsTable, documentsTable } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { getClassificationConfig, calculateCostCents } from './model-config';

// Types
export interface ClassificationResult {
  category: string;
  subtype: string;
  confidence: number;
  metadata: {
    startDate?: string;
    endDate?: string;
    parties?: string[];
    amounts?: number[];
    accountNumbers?: string[];
    summary?: string;
    [key: string]: any;
  };
  tokensUsed: number;
  needsReview: boolean;
  rawResponse?: string;
}

export interface ChatSession {
  id: string;
  caseId: string;
  userId: string;
  documentId?: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number; // in cents
  createdAt: Date;
  updatedAt: Date;
}

// Document category taxonomy
export const DOCUMENT_CATEGORIES = {
  Financial: [
    'Bank Statement',
    'Pay Stub',
    'Tax Return',
    'Investment Statement',
    'Credit Card Statement',
    'Loan Document',
    'Financial Affidavit',
  ],
  Medical: [
    'Medical Records',
    'Medical Bills',
    'Insurance Claim',
    'Prescription Records',
    'Lab Results',
    'Doctor Notes',
  ],
  Legal: [
    'Court Order',
    'Petition',
    'Motion',
    'Subpoena',
    'Affidavit',
    'Contract',
    'Agreement',
    'Judgment',
  ],
  Communications: [
    'Email',
    'Text Messages',
    'Letter',
    'Social Media Posts',
  ],
  Property: [
    'Deed',
    'Title',
    'Appraisal',
    'Property Tax Statement',
    'Mortgage Document',
  ],
  Employment: [
    'Employment Contract',
    'W-2',
    '1099',
    'Performance Review',
    'Termination Letter',
  ],
  Personal: [
    'ID Document',
    'Birth Certificate',
    'Marriage Certificate',
    'Divorce Decree',
    'Passport',
  ],
  Other: [
    'Photograph',
    'Video',
    'Audio Recording',
    'Miscellaneous',
  ],
} as const;

// OpenAI client singleton
let openaiClient: OpenAI | null = null;

// Note: Cost calculation now uses model-config.ts
// CACHE_DISCOUNT preserved for future use with cached prompts
const CACHE_DISCOUNT = 0.9; // 90% discount for cached prompts

/**
 * Initialize OpenAI client
 */
export function initializeOpenAI(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  openaiClient = new OpenAI({ apiKey });
  return true;
}

/**
 * Get OpenAI client (lazy initialization)
 */
function getClient(): OpenAI {
  if (!openaiClient) {
    initializeOpenAI();
  }
  return openaiClient!;
}

/**
 * Create a new AI chat session for a case
 */
export async function createAIChatSession(
  caseId: string,
  userId: string,
  documentId?: string
): Promise<ChatSession> {
  const [session] = await db
    .insert(aiChatSessionsTable)
    .values({
      caseId,
      userId,
      documentId,
      type: 'classification',
      status: 'active',
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      messages: [],
    })
    .returning();

  return {
    id: session.id,
    caseId: session.caseId,
    userId: session.userId,
    documentId: session.documentId || undefined,
    messages: (session.messages || []) as ChatSession['messages'],
    totalInputTokens: session.totalInputTokens || 0,
    totalOutputTokens: session.totalOutputTokens || 0,
    totalCost: session.totalCost || 0,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

/**
 * Get an existing chat session
 */
export async function getChatSession(sessionId: string): Promise<ChatSession | null> {
  const [session] = await db
    .select()
    .from(aiChatSessionsTable)
    .where(eq(aiChatSessionsTable.id, sessionId))
    .limit(1);

  if (!session) return null;

  return {
    id: session.id,
    caseId: session.caseId,
    userId: session.userId,
    documentId: session.documentId || undefined,
    messages: (session.messages || []) as ChatSession['messages'],
    totalInputTokens: session.totalInputTokens || 0,
    totalOutputTokens: session.totalOutputTokens || 0,
    totalCost: session.totalCost || 0,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

/**
 * Add a message to a chat session
 */
export async function addMessageToSession(
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<void> {
  const session = await getChatSession(sessionId);
  if (!session) throw new Error('Session not found');

  const newMessage = {
    role,
    content,
    timestamp: new Date().toISOString(),
  };

  await db
    .update(aiChatSessionsTable)
    .set({
      messages: [...session.messages, newMessage],
    })
    .where(eq(aiChatSessionsTable.id, sessionId));
}

/**
 * Classification prompt template
 */
function getClassificationPrompt(documentText: string, fileName?: string): string {
  const categories = Object.entries(DOCUMENT_CATEGORIES)
    .map(([cat, subtypes]) => `${cat}: ${subtypes.join(', ')}`)
    .join('\n');

  // If no document text, use filename-based classification
  const contentSection = documentText.length > 10
    ? `DOCUMENT TEXT:\n${documentText.substring(0, 4000)} ${documentText.length > 4000 ? '... [truncated]' : ''}`
    : `FILENAME: ${fileName || 'unknown'}\n\nNote: Document text could not be extracted. Please classify based on the filename.`;

  return `You are a legal document classifier for family law cases. Analyze the following document and classify it.

DOCUMENT CATEGORIES AND SUBTYPES:
${categories}

${contentSection}

Respond with a JSON object containing:
{
  "category": "The main category from the list above",
  "subtype": "The specific subtype from that category",
  "confidence": 0.0-1.0 (how confident you are in this classification),
  "metadata": {
    "startDate": "YYYY-MM-DD if applicable",
    "endDate": "YYYY-MM-DD if applicable",
    "parties": ["List of parties mentioned"],
    "amounts": [list of monetary amounts as numbers],
    "accountNumbers": ["last 4 digits only"],
    "summary": "Brief 1-2 sentence summary of the document"
  }
}

Only respond with valid JSON. Be conservative with confidence scores (use lower scores when classifying from filename only).`;
}

/**
 * Classify a document using OpenAI
 */
export async function classifyDocument(
  documentId: string,
  documentText: string,
  caseId?: string,
  userId?: string,
  onChunk?: (chunk: string) => void,
  fileName?: string
): Promise<ClassificationResult> {
  const client = getClient();

  // Create or reuse session
  let session: ChatSession | undefined;
  if (caseId && userId) {
    session = await createAIChatSession(caseId, userId, documentId);
  }

  const prompt = getClassificationPrompt(documentText, fileName);

  // Get model configuration from environment
  const modelConfig = getClassificationConfig();

  try {
    // Determine if model requires max_completion_tokens (o1, o3, gpt-5 series)
    // or legacy max_tokens (gpt-4, gpt-3.5 series)
    const isNewModel = modelConfig.model.startsWith('o1') ||
                       modelConfig.model.startsWith('o3') ||
                       modelConfig.model.startsWith('gpt-5') ||
                       modelConfig.model.startsWith('gpt-4o');

    // Debug logging
    console.log(`[Classification] Model: ${modelConfig.model}, isNewModel: ${isNewModel}`);

    // Build request params - use max_completion_tokens for new models
    const requestParams: any = {
      model: modelConfig.model,
      messages: [
        {
          role: 'system',
          content: 'You are a legal document classification assistant. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: modelConfig.temperature,
    };

    // Check if this is a GPT-5 model (has reasoning capabilities)
    const isGpt5Model = modelConfig.model.startsWith('gpt-5');

    // Add appropriate token limit parameter
    if (isNewModel) {
      // GPT-5 models need much higher token limits due to reasoning overhead
      // Even with reasoning_effort='none', use a safe buffer
      const effectiveMaxTokens = isGpt5Model ? Math.max(modelConfig.maxTokens, 2000) : modelConfig.maxTokens;
      requestParams.max_completion_tokens = effectiveMaxTokens;
      console.log(`[Classification] Using max_completion_tokens: ${effectiveMaxTokens}`);

      // Disable reasoning for classification tasks - saves ~1300+ tokens
      // GPT-5 models support reasoning_effort parameter
      if (isGpt5Model) {
        requestParams.reasoning_effort = 'none';
        console.log(`[Classification] Disabled reasoning for GPT-5 classification`);
      }
    } else {
      requestParams.max_tokens = modelConfig.maxTokens;
      console.log(`[Classification] Using max_tokens: ${modelConfig.maxTokens}`);
    }

    // Only add response_format for models that support it (not o1/o3 reasoning models)
    const isReasoningModel = modelConfig.model.startsWith('o1') || modelConfig.model.startsWith('o3');
    if (!isReasoningModel) {
      requestParams.response_format = { type: 'json_object' };
    }

    // Make API call
    const response = await client.chat.completions.create(requestParams);

    const content = response.choices[0]?.message?.content || '{}';
    const tokensUsed = response.usage?.total_tokens || 0;

    // Parse the response
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('Invalid response from AI');
    }

    // Calculate cost in cents using model config
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const costCents = calculateCostCents(inputTokens, outputTokens, modelConfig);

    // Update session if exists
    if (session) {
      await db
        .update(aiChatSessionsTable)
        .set({
          totalInputTokens: session.totalInputTokens + inputTokens,
          totalOutputTokens: session.totalOutputTokens + outputTokens,
          totalCost: Math.round(session.totalCost + costCents), // Must be integer (cents)
          metadata: {
            lastResponseId: response.id,
            lastClassification: parsed,
          },
        })
        .where(eq(aiChatSessionsTable.id, session.id));
    }

    // Determine if needs review
    const confidence = parsed.confidence || 0;
    const needsReview = confidence < 0.8;

    // Stream chunks if callback provided
    if (onChunk) {
      onChunk(content);
    }

    return {
      category: parsed.category || 'Other',
      subtype: parsed.subtype || 'Miscellaneous',
      confidence,
      metadata: parsed.metadata || {},
      tokensUsed,
      needsReview,
      rawResponse: content,
    };
  } catch (error: any) {
    console.error('Classification error:', error);

    if (error.status === 429) {
      throw new Error('Rate limited');
    }
    if (error.code === 'ETIMEDOUT') {
      throw new Error('Request timeout');
    }

    throw error;
  }
}

/**
 * Get token usage statistics for a case
 */
export async function getTokenUsage(
  caseId: string,
  timeframe: 'day' | 'week' | 'month' = 'month'
): Promise<{ totalTokens: number; estimatedCost: number; sessionsCount: number }> {
  const now = new Date();
  let startDate: Date;

  switch (timeframe) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const sessions = await db
    .select()
    .from(aiChatSessionsTable)
    .where(
      and(
        eq(aiChatSessionsTable.caseId, caseId),
        gte(aiChatSessionsTable.createdAt, startDate)
      )
    );

  const totalTokens = sessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0);
  const estimatedCost = sessions.reduce((sum, s) => sum + Number(s.totalCost || 0), 0);

  return {
    totalTokens,
    estimatedCost,
    sessionsCount: sessions.length,
  };
}

/**
 * Update document with classification results
 */
export async function updateDocumentClassification(
  documentId: string,
  classification: ClassificationResult,
  userId?: string
): Promise<void> {
  const historyEntry = {
    timestamp: new Date().toISOString(),
    category: classification.category,
    subtype: classification.subtype,
    confidence: classification.confidence,
    source: 'ai' as const,
  };

  await db
    .update(documentsTable)
    .set({
      category: classification.category,
      subtype: classification.subtype,
      confidence: Math.round(classification.confidence * 100),
      metadata: classification.metadata,
      needsReview: classification.needsReview,
      classificationHistory: [historyEntry],
    })
    .where(eq(documentsTable.id, documentId));
}

/**
 * Re-classify a document
 */
export async function reclassifyDocument(
  documentId: string,
  userId: string
): Promise<ClassificationResult> {
  // Get document
  const [document] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, documentId))
    .limit(1);

  if (!document) {
    throw new Error('Document not found');
  }

  // TODO: Extract text from document (would need to download from storage)
  // For now, use a placeholder
  const documentText = 'Document text would be extracted here';

  const result = await classifyDocument(documentId, documentText, document.caseId);
  await updateDocumentClassification(documentId, result, userId);

  return result;
}
