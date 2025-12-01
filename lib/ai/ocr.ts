/**
 * OCR Service
 * Extracts text from scanned documents using available OCR services
 *
 * Priority:
 * 1. Google Cloud Vision (if configured) - best for PDFs and images
 * 2. OpenAI Vision API - fallback for images only
 *
 * For scanned PDFs, Google Cloud Vision is required as OpenAI Vision
 * doesn't support PDF files directly.
 */

import OpenAI from 'openai';
import {
  isVisionConfigured,
  ocrPdfWithVision,
  ocrImageWithVision,
} from './google-vision';

export interface OCRResult {
  text: string;
  confidence: number;
  pages: number;
  processingTimeMs: number;
  provider?: 'google-vision' | 'openai-vision' | 'none';
}

/**
 * Extract text from an image buffer
 * Uses Google Vision if configured, falls back to OpenAI Vision
 */
export async function ocrImage(imageBuffer: Buffer): Promise<OCRResult> {
  // Try Google Vision first (more accurate, supports more formats)
  if (isVisionConfigured()) {
    console.log('[OCR] Using Google Cloud Vision for image');
    const result = await ocrImageWithVision(imageBuffer);
    return { ...result, provider: 'google-vision' };
  }

  // Fall back to OpenAI Vision
  console.log('[OCR] Using OpenAI Vision API for image');
  return ocrImageWithOpenAI(imageBuffer);
}

/**
 * Extract text from a scanned PDF
 * Requires Google Cloud Vision (OpenAI Vision doesn't support PDFs)
 */
export async function ocrPDF(pdfBuffer: Buffer): Promise<OCRResult> {
  if (isVisionConfigured()) {
    console.log('[OCR] Using Google Cloud Vision for PDF');
    const result = await ocrPdfWithVision(pdfBuffer);
    return { ...result, provider: 'google-vision' };
  }

  // No PDF OCR available without Google Vision
  console.log('[OCR] Google Cloud Vision not configured - PDF OCR unavailable');
  console.log('[OCR] To enable PDF OCR, add GOOGLE_CLOUD_CREDENTIALS env var');

  return {
    text: '',
    confidence: 0,
    pages: 0,
    processingTimeMs: 0,
    provider: 'none',
  };
}

/**
 * Extract text from an image using OpenAI Vision API
 * Fallback when Google Vision is not configured
 */
async function ocrImageWithOpenAI(imageBuffer: Buffer): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Detect image type from buffer magic bytes
    let mimeType = 'image/png';
    if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) {
      mimeType = 'image/jpeg';
    } else if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) {
      mimeType = 'image/png';
    } else if (imageBuffer[0] === 0x47 && imageBuffer[1] === 0x49) {
      mimeType = 'image/gif';
    } else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49) {
      mimeType = 'image/webp';
    }

    const base64Image = imageBuffer.toString('base64');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract ALL text from this document image exactly as it appears.

Instructions:
- Include ALL numbers, dates, names, amounts, and details
- Preserve the structure and layout
- Format tables as markdown tables if present
- Include headers, footers, and any fine print
- Do not summarize - extract the complete text verbatim`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });

    const text = response.choices[0]?.message?.content || '';

    console.log(`[OCR] OpenAI Vision extracted ${text.length} chars`);

    return {
      text,
      confidence: 85, // OpenAI doesn't provide confidence scores
      pages: 1,
      processingTimeMs: Date.now() - startTime,
      provider: 'openai-vision',
    };
  } catch (error: any) {
    console.error('[OCR] OpenAI Vision error:', error.message || error);
    return {
      text: '',
      confidence: 0,
      pages: 0,
      processingTimeMs: Date.now() - startTime,
      provider: 'openai-vision',
    };
  }
}

/**
 * Detect if a PDF is scanned (image-based) vs text-based
 */
export function isProbablyScanned(
  textLength: number,
  fileSizeBytes: number,
  pageCount: number
): boolean {
  const expectedCharsPerPage = 2000;
  const expectedMinChars = pageCount * expectedCharsPerPage * 0.1;

  if (textLength < expectedMinChars) {
    return true;
  }

  const bytesPerChar = fileSizeBytes / Math.max(textLength, 1);
  if (bytesPerChar > 500) {
    return true;
  }

  return false;
}

/**
 * Check which OCR providers are available
 */
export function getAvailableProviders(): string[] {
  const providers: string[] = [];

  if (isVisionConfigured()) {
    providers.push('google-vision');
  }

  if (process.env.OPENAI_API_KEY) {
    providers.push('openai-vision');
  }

  return providers;
}
