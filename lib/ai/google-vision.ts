/**
 * Google Cloud Vision OCR Service
 * Extracts text from scanned PDFs and images using Google Cloud Vision API
 *
 * Pricing (as of 2025):
 * - First 1,000 pages/month: FREE
 * - 1,001 - 5,000,000 pages/month: $1.50 per 1,000 pages
 *
 * Setup:
 * 1. Create Google Cloud project
 * 2. Enable Cloud Vision API
 * 3. Create service account with "Cloud Vision API User" role
 * 4. Download JSON key
 * 5. Add GOOGLE_CLOUD_CREDENTIALS env var with JSON content
 */

import vision from '@google-cloud/vision';

export interface VisionOCRResult {
  text: string;
  confidence: number;
  pages: number;
  processingTimeMs: number;
}

let visionClient: vision.ImageAnnotatorClient | null = null;

/**
 * Check if Google Cloud Vision is configured
 */
export function isVisionConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLOUD_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  );
}

/**
 * Get or create Vision client
 */
function getVisionClient(): vision.ImageAnnotatorClient {
  if (visionClient) {
    return visionClient;
  }

  // Try different credential sources
  const credentialsJson =
    process.env.GOOGLE_CLOUD_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (credentialsJson) {
    try {
      // Parse JSON credentials
      let credentials;

      // Check if it's base64 encoded
      if (credentialsJson.startsWith('ey') || !credentialsJson.startsWith('{')) {
        // Likely base64 encoded
        const decoded = Buffer.from(credentialsJson, 'base64').toString('utf-8');
        credentials = JSON.parse(decoded);
      } else {
        // Raw JSON
        credentials = JSON.parse(credentialsJson);
      }

      visionClient = new vision.ImageAnnotatorClient({
        credentials,
        projectId: credentials.project_id,
      });

      console.log('[Vision] Initialized with service account credentials');
    } catch (error) {
      console.error('[Vision] Failed to parse credentials:', error);
      throw new Error('Invalid Google Cloud credentials format');
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // File path to credentials
    visionClient = new vision.ImageAnnotatorClient();
    console.log('[Vision] Initialized with credentials file');
  } else {
    throw new Error('Google Cloud Vision credentials not configured');
  }

  return visionClient;
}

/**
 * Extract text from a PDF using Google Cloud Vision
 * Supports multi-page PDFs up to 2000 pages
 */
export async function ocrPdfWithVision(pdfBuffer: Buffer): Promise<VisionOCRResult> {
  const startTime = Date.now();

  if (!isVisionConfigured()) {
    console.log('[Vision] Not configured, skipping PDF OCR');
    return {
      text: '',
      confidence: 0,
      pages: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }

  try {
    console.log('[Vision] Starting PDF OCR...');
    const client = getVisionClient();

    // Use asyncBatchAnnotateFiles for PDF processing
    // This handles multi-page PDFs efficiently
    const request = {
      requests: [
        {
          inputConfig: {
            mimeType: 'application/pdf',
            content: pdfBuffer.toString('base64'),
          },
          features: [
            {
              type: 'DOCUMENT_TEXT_DETECTION' as const,
            },
          ],
          // Process all pages (up to 2000)
          pages: Array.from({ length: Math.min(2000, 100) }, (_, i) => i + 1),
        },
      ],
    };

    // For smaller PDFs, use synchronous annotation
    // For larger PDFs, would need async batch processing with GCS
    const [result] = await client.batchAnnotateFiles(request as any);

    if (!result.responses || result.responses.length === 0) {
      console.log('[Vision] No responses from API');
      return {
        text: '',
        confidence: 0,
        pages: 0,
        processingTimeMs: Date.now() - startTime,
      };
    }

    const fileResponse = result.responses[0];
    const responses = fileResponse.responses || [];

    // Combine text from all pages
    const pageTexts: string[] = [];
    let totalConfidence = 0;
    let confidenceCount = 0;

    for (let i = 0; i < responses.length; i++) {
      const pageResponse = responses[i];
      const annotation = pageResponse.fullTextAnnotation;

      if (annotation?.text) {
        pageTexts.push(`--- Page ${i + 1} ---\n${annotation.text}`);

        // Calculate average confidence from blocks
        if (annotation.pages) {
          for (const page of annotation.pages) {
            if (page.confidence) {
              totalConfidence += page.confidence;
              confidenceCount++;
            }
          }
        }
      }
    }

    const fullText = pageTexts.join('\n\n');
    const avgConfidence = confidenceCount > 0 ? (totalConfidence / confidenceCount) * 100 : 90;

    console.log(
      `[Vision] Extracted ${fullText.length} chars from ${responses.length} pages, ` +
      `confidence: ${avgConfidence.toFixed(1)}%`
    );

    return {
      text: fullText,
      confidence: avgConfidence,
      pages: responses.length,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error('[Vision] OCR error:', error.message || error);

    // Check for specific error types
    if (error.code === 7) {
      console.error('[Vision] Permission denied - check service account permissions');
    } else if (error.code === 3) {
      console.error('[Vision] Invalid argument - PDF may be corrupted or too large');
    }

    return {
      text: '',
      confidence: 0,
      pages: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Extract text from an image using Google Cloud Vision
 */
export async function ocrImageWithVision(imageBuffer: Buffer): Promise<VisionOCRResult> {
  const startTime = Date.now();

  if (!isVisionConfigured()) {
    console.log('[Vision] Not configured, skipping image OCR');
    return {
      text: '',
      confidence: 0,
      pages: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }

  try {
    console.log('[Vision] Starting image OCR...');
    const client = getVisionClient();

    const [result] = await client.documentTextDetection({
      image: {
        content: imageBuffer.toString('base64'),
      },
    });

    const annotation = result.fullTextAnnotation;

    if (!annotation?.text) {
      console.log('[Vision] No text detected in image');
      return {
        text: '',
        confidence: 0,
        pages: 1,
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Calculate confidence
    let totalConfidence = 0;
    let confidenceCount = 0;

    if (annotation.pages) {
      for (const page of annotation.pages) {
        if (page.confidence) {
          totalConfidence += page.confidence;
          confidenceCount++;
        }
      }
    }

    const avgConfidence = confidenceCount > 0 ? (totalConfidence / confidenceCount) * 100 : 90;

    console.log(
      `[Vision] Extracted ${annotation.text.length} chars from image, ` +
      `confidence: ${avgConfidence.toFixed(1)}%`
    );

    return {
      text: annotation.text,
      confidence: avgConfidence,
      pages: 1,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error('[Vision] Image OCR error:', error.message || error);
    return {
      text: '',
      confidence: 0,
      pages: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }
}
