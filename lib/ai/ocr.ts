/**
 * OCR Service
 * Extracts text from images using OpenAI Vision API
 *
 * For images (PNG, JPG, etc.): Uses Vision API directly
 * For scanned PDFs: Currently not supported in serverless (requires native deps)
 *
 * Future enhancement: Add Google Cloud Vision or AWS Textract for PDF OCR
 */

import OpenAI from 'openai';

export interface OCRResult {
  text: string;
  confidence: number;
  pages: number;
  processingTimeMs: number;
}

/**
 * Extract text from an image buffer using OpenAI Vision API
 */
export async function ocrImage(imageBuffer: Buffer): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    console.log('[OCR] Using OpenAI Vision API for image...');

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

    console.log(`[OCR] Vision API extracted ${text.length} chars from image`);

    return {
      text,
      confidence: 90,
      pages: 1,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error('[OCR] Vision API error:', error.message || error);
    return {
      text: '',
      confidence: 0,
      pages: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Extract text from a scanned PDF
 *
 * NOTE: PDF-to-image conversion requires native dependencies (canvas, poppler)
 * that don't work in Vercel's serverless environment.
 *
 * For now, scanned PDFs will be classified by filename.
 * TODO: Add Google Cloud Vision or AWS Textract for PDF OCR
 */
export async function ocrPDF(_pdfBuffer: Buffer): Promise<OCRResult> {
  const startTime = Date.now();

  console.log('[OCR] Scanned PDF detected but PDF OCR not available in serverless.');
  console.log('[OCR] Document will be classified by filename.');

  return {
    text: '',
    confidence: 0,
    pages: 0,
    processingTimeMs: Date.now() - startTime,
  };
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
