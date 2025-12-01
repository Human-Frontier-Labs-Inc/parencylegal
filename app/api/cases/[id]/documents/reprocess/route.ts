/**
 * Reprocess Documents API
 * POST /api/cases/:id/documents/reprocess - Reprocess single or all documents
 *
 * Triggers re-classification and OCR for documents
 */

import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable, documentsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { classifyAndStore } from "@/lib/ai/classification";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { id: caseId } = await params;
    const body = await request.json();
    const { documentId, reprocessAll = false } = body;

    // Verify case belongs to user
    const [caseData] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

    if (!caseData) {
      return new Response(JSON.stringify({ error: "Case not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get documents to reprocess
    let documents;
    if (reprocessAll) {
      documents = await db
        .select()
        .from(documentsTable)
        .where(eq(documentsTable.caseId, caseId));
    } else if (documentId) {
      documents = await db
        .select()
        .from(documentsTable)
        .where(
          and(
            eq(documentsTable.id, documentId),
            eq(documentsTable.caseId, caseId)
          )
        );
    } else {
      return new Response(
        JSON.stringify({ error: "documentId or reprocessAll required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (documents.length === 0) {
      return new Response(JSON.stringify({ error: "No documents found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`[Reprocess] Starting reprocess of ${documents.length} document(s)`);

    // Reset document status to pending before reprocessing
    for (const doc of documents) {
      await db
        .update(documentsTable)
        .set({
          processingStatus: "pending",
          category: null,
          subtype: null,
          confidence: null,
          extractedText: null,
          metadata: null,
        })
        .where(eq(documentsTable.id, doc.id));
    }

    // Process documents
    const results: Array<{
      documentId: string;
      fileName: string;
      success: boolean;
      error?: string;
      category?: string;
      subtype?: string;
      extractionMethod?: string;
    }> = [];

    for (const doc of documents) {
      try {
        console.log(`[Reprocess] Processing: ${doc.fileName}`);

        const result = await classifyAndStore(doc.id, userId);

        results.push({
          documentId: doc.id,
          fileName: doc.fileName,
          success: true,
          category: result.category,
          subtype: result.subtype,
          extractionMethod: result.extractionMethod,
        });

        console.log(`[Reprocess] Completed: ${doc.fileName} - ${result.extractionMethod}`);
      } catch (error: any) {
        console.error(`[Reprocess] Failed: ${doc.fileName}`, error);

        // Mark as failed
        await db
          .update(documentsTable)
          .set({ processingStatus: "failed" })
          .where(eq(documentsTable.id, doc.id));

        results.push({
          documentId: doc.id,
          fileName: doc.fileName,
          success: false,
          error: error.message,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`[Reprocess] Complete: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        message: `Reprocessed ${documents.length} document(s)`,
        total: documents.length,
        successful,
        failed,
        results,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Reprocess] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
