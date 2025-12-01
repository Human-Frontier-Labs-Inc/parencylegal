/**
 * Document Enrichment API
 * Phase 12.2b: Enrich existing documents with AI-generated smart summaries
 *
 * POST /api/documents/enrich
 * Body: { documentId: string } or { caseId: string } for batch enrichment
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { documentsTable } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { classifyDocument, updateDocumentClassification } from "@/lib/ai/openai";
import { extractTextFromPDF } from "@/lib/ai/classification";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60; // 60 second timeout for enrichment

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get document text from Supabase storage
 */
async function getDocumentText(
  document: {
    fileName: string;
    storagePath: string;
  }
): Promise<string> {
  const fileName = document.fileName.toLowerCase();

  // Only process PDFs and text files for now
  if (!fileName.endsWith(".pdf") && !fileName.endsWith(".txt")) {
    console.log(`[Enrich] Skipping non-PDF/text file: ${fileName}`);
    return "";
  }

  // Download from Supabase storage
  try {
    console.log(`[Enrich] Downloading from storage: ${document.storagePath}`);
    const { data, error } = await supabase.storage
      .from("documents")
      .download(document.storagePath);

    if (error) {
      console.error("[Enrich] Supabase download error:", error);
      return "";
    }

    if (!data) {
      console.log("[Enrich] No data returned from Supabase");
      return "";
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    console.log(`[Enrich] Downloaded ${buffer.length} bytes`);

    if (fileName.endsWith(".pdf")) {
      const result = await extractTextFromPDF(buffer);
      console.log(`[Enrich] Extracted ${result.wordCount} words from PDF`);
      return result.text || "";
    } else if (fileName.endsWith(".txt")) {
      return buffer.toString("utf-8");
    }
  } catch (error) {
    console.error("[Enrich] Error downloading document:", error);
  }

  return "";
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, caseId } = body;

    if (!documentId && !caseId) {
      return NextResponse.json(
        { error: "documentId or caseId required" },
        { status: 400 }
      );
    }

    // Single document enrichment
    if (documentId) {
      const [document] = await db
        .select()
        .from(documentsTable)
        .where(
          and(
            eq(documentsTable.id, documentId),
            eq(documentsTable.userId, userId)
          )
        )
        .limit(1);

      if (!document) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        );
      }

      // Skip if already has smart summary
      if (document.smartSummary) {
        return NextResponse.json({
          success: true,
          message: "Document already has smart summary",
          documentId,
          smartSummary: document.smartSummary,
        });
      }

      // Get document text
      const documentText = await getDocumentText({
        fileName: document.fileName,
        storagePath: document.storagePath,
      });

      if (!documentText || documentText.length < 50) {
        return NextResponse.json({
          success: false,
          message: "Could not extract enough text from document for enrichment",
          documentId,
        });
      }

      // Re-classify with enhanced prompt
      console.log(`[Enrich] Enriching document ${documentId} with ${documentText.length} chars`);
      const result = await classifyDocument(
        documentId,
        documentText,
        document.caseId,
        userId,
        undefined,
        document.fileName
      );

      // Update document with new analysis
      await updateDocumentClassification(documentId, result, userId);

      return NextResponse.json({
        success: true,
        documentId,
        smartSummary: result.smartSummary,
        fullAnalysis: result.fullAnalysis,
        tokensUsed: result.tokensUsed,
      });
    }

    // Batch enrichment for a case
    if (caseId) {
      // Get all documents in case without smart summaries
      const documents = await db
        .select()
        .from(documentsTable)
        .where(
          and(
            eq(documentsTable.caseId, caseId),
            eq(documentsTable.userId, userId),
            isNull(documentsTable.smartSummary)
          )
        )
        .limit(10); // Limit batch size

      if (documents.length === 0) {
        return NextResponse.json({
          success: true,
          message: "All documents already have smart summaries",
          enrichedCount: 0,
        });
      }

      const results: Array<{
        documentId: string;
        success: boolean;
        error?: string;
      }> = [];

      // Process documents sequentially to avoid rate limits
      for (const doc of documents) {
        try {
          const documentText = await getDocumentText({
            fileName: doc.fileName,
            storagePath: doc.storagePath,
          });

          if (!documentText || documentText.length < 50) {
            results.push({
              documentId: doc.id,
              success: false,
              error: "Insufficient text content",
            });
            continue;
          }

          const result = await classifyDocument(
            doc.id,
            documentText,
            doc.caseId,
            userId,
            undefined,
            doc.fileName
          );

          await updateDocumentClassification(doc.id, result, userId);

          results.push({
            documentId: doc.id,
            success: true,
          });
        } catch (error: any) {
          console.error(`[Enrich] Error enriching ${doc.id}:`, error);
          results.push({
            documentId: doc.id,
            success: false,
            error: error.message,
          });
        }
      }

      const successCount = results.filter((r) => r.success).length;

      return NextResponse.json({
        success: true,
        enrichedCount: successCount,
        totalProcessed: results.length,
        remainingWithoutSummary: documents.length - successCount,
        results,
      });
    }
  } catch (error: any) {
    console.error("[Enrich] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
