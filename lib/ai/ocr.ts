/**
 * OCR Service using Tesseract.js
 * Extracts text from images
 *
 * Note: For scanned PDFs, we use OpenAI's vision API which is more reliable
 * in serverless environments than pdf-to-image conversion + Tesseract
 */

import Tesseract from 'tesseract.js';
import OpenAI from 'openai';

export interface OCRResult {
  text: string;
  confidence: number;
  pages: number;
  processingTimeMs: number;
}

/**
 * Extract text from an image buffer using Tesseract OCR
 */
export async function ocrImage(imageBuffer: Buffer): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    console.log('[OCR] Starting Tesseract OCR on image...');

    const result = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`[OCR] Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const text = result.data.text;
    const confidence = result.data.confidence;

    console.log(
      `[OCR] Completed. Extracted ${text.length} chars, confidence: ${confidence}%`
    );

    return {
      text,
      confidence,
      pages: 1,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[OCR] Tesseract error:', error);
    return {
      text: '',
      confidence: 0,
      pages: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Extract text from a scanned PDF using OpenAI's vision API
 * This is more reliable in serverless environments than local PDF-to-image conversion
 */
export async function ocrPDF(pdfBuffer: Buffer): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    console.log('[OCR] Using OpenAI Vision API for scanned PDF...');

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Convert PDF buffer to base64
    const base64Pdf = pdfBuffer.toString('base64');

    // Use GPT-4 Vision to extract text from the PDF
    // Note: GPT-4V can directly read PDFs as of late 2024
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // gpt-4o-mini supports vision
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `This is a scanned document. Please extract ALL text from this document exactly as it appears, preserving the structure as much as possible. Include all numbers, dates, names, and details. Format tables as markdown tables if present. Do not summarize - extract the complete text.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64Pdf}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    });

    const text = response.choices[0]?.message?.content || '';

    console.log(`[OCR] Vision API extracted ${text.length} chars`);

    return {
      text,
      confidence: 90, // Vision API is generally high confidence
      pages: 1, // We process as single request
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error('[OCR] Vision API error:', error);

    // If Vision API fails (e.g., PDF not supported), return empty
    // The document will still be classified by filename
    return {
      text: '',
      confidence: 0,
      pages: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Detect if a PDF is scanned (image-based) vs text-based
 * by checking the ratio of extracted text to file size
 */
export function isProbablyScanned(
  textLength: number,
  fileSizeBytes: number,
  pageCount: number
): boolean {
  // Typical text PDFs have roughly 2000-4000 chars per page
  // Scanned PDFs have almost no extractable text
  const expectedCharsPerPage = 2000;
  const expectedMinChars = pageCount * expectedCharsPerPage * 0.1; // 10% threshold

  if (textLength < expectedMinChars) {
    return true;
  }

  // Also check text-to-size ratio
  // Text PDFs typically have 10-50 bytes per character
  // Scanned PDFs have many more bytes per character (images)
  const bytesPerChar = fileSizeBytes / Math.max(textLength, 1);
  if (bytesPerChar > 500) {
    return true;
  }

  return false;
}
