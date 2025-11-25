/**
 * OpenAI Service
 * Handles AI-powered document classification using OpenAI API
 */

import OpenAI from 'openai';
import { db } from '@/db/db';
import { aiChatSessionsTable, documentsTable } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';

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
  documentId?: string;
  responseId?: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  totalTokens: number;
  totalCost: number;
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

// Cost per 1000 tokens (approximate for GPT-4o-mini)
const INPUT_COST_PER_1K = 0.00015;
const OUTPUT_COST_PER_1K = 0.0006;
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
  documentId?: string
): Promise<ChatSession> {
  const [session] = await db
    .insert(aiChatSessionsTable)
    .values({
      caseId,
      documentId,
      purpose: 'classification',
      status: 'active',
      totalTokens: 0,
      totalCost: 0,
      messages: [],
    })
    .returning();

  return {
    id: session.id,
    caseId: session.caseId,
    documentId: session.documentId || undefined,
    responseId: session.responseId || undefined,
    messages: (session.messages || []) as ChatSession['messages'],
    totalTokens: session.totalTokens || 0,
    totalCost: Number(session.totalCost) || 0,
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
    documentId: session.documentId || undefined,
    responseId: session.responseId || undefined,
    messages: (session.messages || []) as ChatSession['messages'],
    totalTokens: session.totalTokens || 0,
    totalCost: Number(session.totalCost) || 0,
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
function getClassificationPrompt(documentText: string): string {
  const categories = Object.entries(DOCUMENT_CATEGORIES)
    .map(([cat, subtypes]) => `${cat}: ${subtypes.join(', ')}`)
    .join('\n');

  return `You are a legal document classifier for family law cases. Analyze the following document and classify it.

DOCUMENT CATEGORIES AND SUBTYPES:
${categories}

DOCUMENT TEXT:
${documentText.substring(0, 4000)} ${documentText.length > 4000 ? '... [truncated]' : ''}

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

Only respond with valid JSON. Be conservative with confidence scores.`;
}

/**
 * Classify a document using OpenAI
 */
export async function classifyDocument(
  documentId: string,
  documentText: string,
  caseId?: string,
  onChunk?: (chunk: string) => void
): Promise<ClassificationResult> {
  const client = getClient();

  // Create or reuse session
  let session: ChatSession | undefined;
  if (caseId) {
    session = await createAIChatSession(caseId, documentId);
  }

  const prompt = getClassificationPrompt(documentText);

  try {
    // Make API call
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective model
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
      temperature: 0.1, // Low temperature for consistent classifications
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    const tokensUsed = response.usage?.total_tokens || 0;

    // Parse the response
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('Invalid response from AI');
    }

    // Calculate cost
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const cost = (inputTokens / 1000) * INPUT_COST_PER_1K + (outputTokens / 1000) * OUTPUT_COST_PER_1K;

    // Update session if exists
    if (session) {
      await db
        .update(aiChatSessionsTable)
        .set({
          totalTokens: session.totalTokens + tokensUsed,
          totalCost: String(session.totalCost + cost),
          responseId: response.id,
          lastClassification: parsed,
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
