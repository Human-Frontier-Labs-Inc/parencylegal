/**
 * OCR Service using Tesseract.js
 * Extracts text from scanned PDFs and images
 */

import Tesseract from 'tesseract.js';

// Lazy load pdf-img-convert to avoid issues in edge runtime
let pdfToImg: typeof import('pdf-img-convert') | null = null;

async function getPdfToImg() {
  if (!pdfToImg) {
    pdfToImg = await import('pdf-img-convert');
  }
  return pdfToImg;
}

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
 * Convert PDF pages to images and run OCR on each
 */
export async function ocrPDF(pdfBuffer: Buffer): Promise<OCRResult> {
  const startTime = Date.now();

  try {
    console.log('[OCR] Converting PDF to images...');

    const pdf2img = await getPdfToImg();

    // Convert PDF to images (PNG format)
    const images = await pdf2img.convert(pdfBuffer, {
      width: 2000, // Higher resolution for better OCR
      height: 2800,
      page_numbers: undefined, // All pages
    });

    console.log(`[OCR] Converted ${images.length} pages to images`);

    if (images.length === 0) {
      return {
        text: '',
        confidence: 0,
        pages: 0,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // OCR each page
    const pageTexts: string[] = [];
    let totalConfidence = 0;

    for (let i = 0; i < images.length; i++) {
      console.log(`[OCR] Processing page ${i + 1}/${images.length}...`);

      const imageData = images[i];
      // pdf-img-convert returns Uint8Array
      const imageBuffer = Buffer.from(imageData as Uint8Array);

      const pageResult = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && m.progress === 1) {
            console.log(`[OCR] Page ${i + 1} complete`);
          }
        },
      });

      pageTexts.push(`--- Page ${i + 1} ---\n${pageResult.data.text}`);
      totalConfidence += pageResult.data.confidence;
    }

    const fullText = pageTexts.join('\n\n');
    const avgConfidence = totalConfidence / images.length;

    console.log(
      `[OCR] PDF OCR complete. ${fullText.length} chars, avg confidence: ${avgConfidence.toFixed(1)}%`
    );

    return {
      text: fullText,
      confidence: avgConfidence,
      pages: images.length,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('[OCR] PDF OCR error:', error);
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
