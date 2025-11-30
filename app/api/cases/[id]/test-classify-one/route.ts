/**
 * Test Single Document Classification
 * Tries to classify ONE document end-to-end with detailed logging
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db/db';
import { casesTable, documentsTable } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(`[TestClassifyOne] ${msg}`);
    logs.push(msg);
  };

  try {
    log('Starting test classification...');

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized', logs }, { status: 401 });
    }
    log(`User authenticated: ${userId}`);

    const { id: caseId } = await params;
    log(`Case ID: ${caseId}`);

    // Verify case belongs to user
    const [caseRecord] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)))
      .limit(1);

    if (!caseRecord) {
      return NextResponse.json({ error: 'Case not found', logs }, { status: 404 });
    }
    log(`Case found: ${caseRecord.name}`);

    // Get first unclassified document
    const [doc] = await db
      .select()
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.caseId, caseId),
          eq(documentsTable.userId, userId),
          isNull(documentsTable.category)
        )
      )
      .limit(1);

    if (!doc) {
      return NextResponse.json({
        success: false,
        error: 'No unclassified documents found',
        logs
      });
    }
    log(`Document found: ${doc.fileName} (${doc.id})`);
    log(`Storage path: ${doc.storagePath}`);
    log(`File type: ${doc.fileType}`);

    // Try to download from Supabase
    log('Attempting to download from Supabase storage...');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('case-documents')
      .download(doc.storagePath);

    if (downloadError) {
      log(`Download ERROR: ${downloadError.message}`);
      return NextResponse.json({
        success: false,
        error: `Failed to download: ${downloadError.message}`,
        step: 'download',
        logs,
      });
    }

    if (!fileData) {
      log('Download returned null data');
      return NextResponse.json({
        success: false,
        error: 'Download returned null',
        step: 'download',
        logs,
      });
    }

    const fileSize = fileData.size;
    log(`Downloaded successfully: ${fileSize} bytes`);

    // Convert to buffer
    const fileBuffer = Buffer.from(await fileData.arrayBuffer());
    log(`Buffer created: ${fileBuffer.length} bytes`);

    // Try text extraction
    log('Attempting text extraction...');
    let extractedText = '';
    try {
      const { extractText } = await import('@/lib/ai/classification');
      let mimeType = doc.fileType || 'application/pdf';
      if (!mimeType.includes('/')) {
        mimeType = `application/${mimeType}`;
      }
      log(`MIME type: ${mimeType}`);

      const result = await extractText(fileBuffer, mimeType);
      extractedText = result.text;
      log(`Text extracted: ${result.wordCount} words, ${result.pages} pages, scanned: ${result.isScanned}`);
      log(`First 200 chars: ${extractedText.substring(0, 200)}...`);
    } catch (extractError: any) {
      log(`Extraction ERROR: ${extractError.message}`);
      return NextResponse.json({
        success: false,
        error: `Text extraction failed: ${extractError.message}`,
        step: 'extraction',
        logs,
      });
    }

    // Try classification
    log('Attempting AI classification...');
    try {
      const { classifyDocument } = await import('@/lib/ai/openai');

      const classification = await classifyDocument(
        doc.id,
        extractedText,
        doc.caseId,
        userId,
        undefined,
        doc.fileName
      );

      log(`Classification successful!`);
      log(`Category: ${classification.category}`);
      log(`Subtype: ${classification.subtype}`);
      log(`Confidence: ${classification.confidence}`);
      log(`Tokens used: ${classification.tokensUsed}`);

      // Update the document
      log('Updating document in database...');
      await db
        .update(documentsTable)
        .set({
          category: classification.category,
          subtype: classification.subtype,
          confidence: Math.round(classification.confidence * 100),
          metadata: classification.metadata,
          needsReview: classification.needsReview,
        })
        .where(eq(documentsTable.id, doc.id));

      log('Document updated successfully!');

      return NextResponse.json({
        success: true,
        document: {
          id: doc.id,
          fileName: doc.fileName,
        },
        classification: {
          category: classification.category,
          subtype: classification.subtype,
          confidence: classification.confidence,
          tokensUsed: classification.tokensUsed,
        },
        logs,
      });
    } catch (classifyError: any) {
      log(`Classification ERROR: ${classifyError.message}`);
      log(`Error status: ${classifyError.status}`);
      log(`Error code: ${classifyError.code}`);
      return NextResponse.json({
        success: false,
        error: `Classification failed: ${classifyError.message}`,
        errorDetails: {
          status: classifyError.status,
          code: classifyError.code,
          type: classifyError.type,
        },
        step: 'classification',
        logs,
      });
    }
  } catch (error: any) {
    log(`UNEXPECTED ERROR: ${error.message}`);
    return NextResponse.json({
      success: false,
      error: error.message,
      step: 'unknown',
      logs,
    }, { status: 500 });
  }
}
