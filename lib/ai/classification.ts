/**
 * Document Classification Engine
 * Handles text extraction and document classification
 * Note: pdf-parse has issues in serverless, using dynamic import with fallback
 */

import { db } from '@/db/db';
import { documentsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import {
  classifyDocument as aiClassify,
  updateDocumentClassification,
  DOCUMENT_CATEGORIES,
  type ClassificationResult,
} from './openai';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Types
export interface ExtractedText {
  text: string;
  pages: number;
  isScanned: boolean;
  wordCount: number;
}

export interface ClassificationPipelineResult extends ClassificationResult {
  documentId: string;
  extractionMethod: 'pdf-parse' | 'ocr' | 'text';
  processingTimeMs: number;
}

/**
 * Extract text from a PDF file
 * Note: pdf-parse has issues in Vercel serverless due to pdfjs-dist requiring DOMMatrix
 * For now, we'll use the filename and let AI classify based on that
 * TODO: Use a serverless-compatible PDF parser or external service
 */
export async function extractTextFromPDF(fileBuffer: Buffer): Promise<ExtractedText> {
  // pdf-parse doesn't work reliably in Vercel serverless environment
  // due to pdfjs-dist requiring browser APIs (DOMMatrix, Canvas, etc.)
  // Return empty text - classification will use filename-based approach
  console.log('[Classification] PDF text extraction skipped in serverless - using filename-based classification');

  return {
    text: '',
    pages: 1,
    isScanned: true,
    wordCount: 0,
  };
}

/**
 * Extract text from an image using OCR
 * Note: For production, integrate with Tesseract.js or cloud OCR service
 */
export async function extractTextFromImage(fileBuffer: Buffer): Promise<string> {
  // Placeholder - in production, use Tesseract.js or Google Cloud Vision
  console.warn('OCR not implemented - returning placeholder');
  return 'OCR text extraction not yet implemented';
}

/**
 * Extract text from a document based on its MIME type
 */
export async function extractText(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractedText> {
  if (mimeType === 'application/pdf') {
    return extractTextFromPDF(fileBuffer);
  }

  if (mimeType.startsWith('image/')) {
    const text = await extractTextFromImage(fileBuffer);
    return {
      text,
      pages: 1,
      isScanned: true,
      wordCount: text.split(/\s+/).length,
    };
  }

  if (mimeType === 'text/plain') {
    const text = fileBuffer.toString('utf-8');
    return {
      text,
      pages: 1,
      isScanned: false,
      wordCount: text.split(/\s+/).length,
    };
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

/**
 * Extract metadata from document text based on category
 */
export async function extractMetadata(
  text: string,
  category: string
): Promise<Record<string, any>> {
  const metadata: Record<string, any> = {};

  // Extract dates
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{4})/g,
    /(\d{4}-\d{2}-\d{2})/g,
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
  ];

  const dates: string[] = [];
  for (const pattern of datePatterns) {
    const matches = text.match(pattern) || [];
    dates.push(...matches);
  }

  if (dates.length > 0) {
    metadata.startDate = dates[0];
    if (dates.length > 1) {
      metadata.endDate = dates[dates.length - 1];
    }
  }

  // Extract amounts (for Financial category)
  if (category === 'Financial') {
    const amountPattern = /\$[\d,]+\.?\d*/g;
    const amounts = text.match(amountPattern) || [];
    metadata.amounts = amounts
      .map(a => parseFloat(a.replace(/[$,]/g, '')))
      .filter(a => !isNaN(a));
  }

  // Extract account numbers (masked)
  const accountPattern = /(?:account|acct)[\s#:]*(\d{4,})/gi;
  const accountMatches = text.matchAll(accountPattern);
  const accounts: string[] = [];
  for (const match of accountMatches) {
    const num = match[1];
    accounts.push('****' + num.slice(-4));
  }
  if (accounts.length > 0) {
    metadata.accountNumbers = [...new Set(accounts)];
  }

  // Extract parties (for Legal category)
  if (category === 'Legal') {
    const partyPatterns = [
      /(\w+\s+\w+)\s*(?:\(|,\s*)(Petitioner|Respondent|Plaintiff|Defendant)/gi,
      /(?:Petitioner|Respondent|Plaintiff|Defendant)[:\s]+(\w+\s+\w+)/gi,
    ];

    const parties: string[] = [];
    for (const pattern of partyPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        parties.push(match[1].trim());
      }
    }
    if (parties.length > 0) {
      metadata.parties = [...new Set(parties)];
    }
  }

  // Generate summary (first meaningful sentence)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  if (sentences.length > 0) {
    metadata.summary = sentences[0].trim().substring(0, 150) + '...';
  }

  return metadata;
}

/**
 * Calculate confidence score based on classification quality indicators
 */
export function calculateConfidence(
  category: string,
  subtype: string,
  textQuality: number
): number {
  let confidence = 0.5; // Base confidence

  // Category is valid
  if (category in DOCUMENT_CATEGORIES) {
    confidence += 0.2;
  }

  // Subtype matches category
  const validSubtypes = DOCUMENT_CATEGORIES[category as keyof typeof DOCUMENT_CATEGORIES] || [];
  if (validSubtypes.includes(subtype as any)) {
    confidence += 0.2;
  }

  // Text quality affects confidence
  confidence += textQuality * 0.1;

  return Math.min(confidence, 1);
}

/**
 * Full classification pipeline - extract, classify, and store
 */
export async function classifyAndStore(
  documentId: string,
  userId: string
): Promise<ClassificationPipelineResult> {
  const startTime = Date.now();

  // Get document from database
  const [document] = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.id, documentId))
    .limit(1);

  if (!document) {
    throw new Error('Document not found');
  }

  // Download file from storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('case-documents')
    .download(document.storagePath);

  if (downloadError || !fileData) {
    throw new Error('Failed to download document');
  }

  const fileBuffer = Buffer.from(await fileData.arrayBuffer());
  const mimeType = document.fileType || 'application/pdf';

  // Extract text
  let extractedText: ExtractedText;
  let extractionMethod: 'pdf-parse' | 'ocr' | 'text' = 'pdf-parse';

  try {
    extractedText = await extractText(fileBuffer, `application/${mimeType}`);

    // If scanned, try OCR
    if (extractedText.isScanned && extractedText.wordCount < 50) {
      const ocrText = await extractTextFromImage(fileBuffer);
      if (ocrText.length > extractedText.text.length) {
        extractedText.text = ocrText;
        extractionMethod = 'ocr';
      }
    }
  } catch (error) {
    // Fallback for non-PDF files
    extractedText = {
      text: '',
      pages: 1,
      isScanned: true,
      wordCount: 0,
    };
    extractionMethod = 'ocr';
  }

  // Classify using AI (pass filename for fallback when text extraction fails)
  const classification = await aiClassify(
    documentId,
    extractedText.text,
    document.caseId,
    undefined, // onChunk
    document.fileName // filename for fallback classification
  );

  // Extract additional metadata
  const additionalMetadata = await extractMetadata(
    extractedText.text,
    classification.category
  );

  // Merge metadata
  const fullMetadata = {
    ...classification.metadata,
    ...additionalMetadata,
    pages: extractedText.pages,
    wordCount: extractedText.wordCount,
    isScanned: extractedText.isScanned,
  };

  // Calculate final confidence
  const textQuality = extractedText.wordCount > 100 ? 1 : extractedText.wordCount / 100;
  const finalConfidence = calculateConfidence(
    classification.category,
    classification.subtype,
    textQuality
  );

  // Update the classification result
  const finalResult: ClassificationPipelineResult = {
    ...classification,
    confidence: Math.min(classification.confidence, finalConfidence),
    metadata: fullMetadata,
    needsReview: finalConfidence < 0.8 || classification.needsReview,
    documentId,
    extractionMethod,
    processingTimeMs: Date.now() - startTime,
  };

  // Store classification in database
  await updateDocumentClassification(documentId, finalResult, userId);

  return finalResult;
}

/**
 * Classify all unclassified documents in a case
 */
export async function classifyAllDocuments(
  caseId: string,
  userId: string
): Promise<{ processed: number; successful: number; failed: number; results: ClassificationPipelineResult[] }> {
  // Get all unclassified documents
  const documents = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.caseId, caseId));

  const unclassified = documents.filter(d => !d.category);

  const results: ClassificationPipelineResult[] = [];
  let successful = 0;
  let failed = 0;

  for (const doc of unclassified) {
    try {
      const result = await classifyAndStore(doc.id, userId);
      results.push(result);
      successful++;
    } catch (error) {
      console.error(`Failed to classify document ${doc.id}:`, error);
      failed++;
    }
  }

  return {
    processed: unclassified.length,
    successful,
    failed,
    results,
  };
}

/**
 * Get classification statistics for a case
 */
export async function getClassificationStats(caseId: string): Promise<{
  total: number;
  classified: number;
  needsReview: number;
  byCategory: Record<string, number>;
  averageConfidence: number;
}> {
  const documents = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.caseId, caseId));

  const classified = documents.filter(d => d.category);
  const needsReview = documents.filter(d => d.needsReview);

  const byCategory: Record<string, number> = {};
  for (const doc of classified) {
    const cat = doc.category || 'Other';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  const confidences = classified
    .map(d => d.confidence || 0)
    .filter(c => c > 0);

  const averageConfidence = confidences.length > 0
    ? confidences.reduce((a, b) => a + b, 0) / confidences.length / 100
    : 0;

  return {
    total: documents.length,
    classified: classified.length,
    needsReview: needsReview.length,
    byCategory,
    averageConfidence,
  };
}
