/**
 * Embed Documents API
 * Generates embeddings for documents that were classified before RAG was added
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable, documentsTable, documentChunksTable } from "@/db/schema";
import { eq, and, notInArray } from "drizzle-orm";
import { downloadFile } from "@/lib/storage";
import { chunkDocument, extractPageNumbers, addPageNumbersToChunks } from "@/lib/ai/chunking";
import { storeChunksWithEmbeddings } from "@/lib/ai/embeddings";
import { extractText } from "@/lib/ai/classification";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: caseId } = await params;

    // Verify case belongs to user
    const [caseData] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

    if (!caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Get documents that already have chunks
    const existingChunks = await db
      .select({ documentId: documentChunksTable.documentId })
      .from(documentChunksTable)
      .where(eq(documentChunksTable.caseId, caseId));

    const embeddedDocIds = [...new Set(existingChunks.map(c => c.documentId))];

    // Get classified documents that don't have embeddings yet
    const documents = await db
      .select()
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.caseId, caseId),
          eq(documentsTable.userId, userId)
        )
      );

    const docsToEmbed = documents.filter(
      d => d.category && !embeddedDocIds.includes(d.id)
    );

    if (docsToEmbed.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All documents already have embeddings",
        processed: 0,
        alreadyEmbedded: embeddedDocIds.length,
      });
    }

    let processed = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const doc of docsToEmbed) {
      try {
        // Download file from Vercel Blob
        const fileUrl = doc.storageUrl || doc.storagePath;
        if (!fileUrl) {
          errors.push(`${doc.fileName}: No storage URL`);
          failed++;
          continue;
        }

        let fileBuffer: Buffer;
        try {
          fileBuffer = await downloadFile(fileUrl);
        } catch {
          errors.push(`${doc.fileName}: Failed to download`);
          failed++;
          continue;
        }
        let mimeType = doc.fileType || "application/pdf";
        if (!mimeType.includes("/")) {
          mimeType = `application/${mimeType}`;
        }

        // Extract text
        let extractedText;
        try {
          extractedText = await extractText(fileBuffer, mimeType);
        } catch {
          extractedText = { text: "", pages: 1, isScanned: true, wordCount: 0 };
        }

        if (!extractedText.text || extractedText.text.length < 100) {
          errors.push(`${doc.fileName}: Not enough text to embed`);
          failed++;
          continue;
        }

        // Chunk the document
        let chunks = chunkDocument(extractedText.text);

        // Add page numbers if available
        const pageMap = extractPageNumbers(extractedText.text);
        if (pageMap.size > 0) {
          chunks = addPageNumbersToChunks(chunks, pageMap);
        }

        // Store chunks with embeddings
        if (chunks.length > 0) {
          await storeChunksWithEmbeddings(doc.id, caseId, userId, chunks);
          processed++;
          console.log(`[Embed] Created ${chunks.length} chunks for ${doc.fileName}`);
        }
      } catch (error: any) {
        errors.push(`${doc.fileName}: ${error.message}`);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Embedded ${processed} documents`,
      processed,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      totalDocuments: documents.length,
      alreadyEmbedded: embeddedDocIds.length,
    });
  } catch (error: any) {
    console.error("[Embed] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to embed documents" },
      { status: 500 }
    );
  }
}
