/**
 * Debug endpoint to check document chunks status
 * Temporary - can be removed after debugging
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: caseId } = await params;

    // Check if table exists
    const tableCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'document_chunks'
      ) as exists
    `);

    // Count chunks for this case
    const chunkCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM document_chunks WHERE case_id = ${caseId}
    `);

    // Get sample chunk (without embedding to keep response small)
    const sampleChunk = await db.execute(sql`
      SELECT id, document_id, case_id, chunk_index,
             LEFT(content, 200) as content_preview,
             CASE WHEN embedding IS NOT NULL THEN 'yes' ELSE 'no' END as has_embedding
      FROM document_chunks
      WHERE case_id = ${caseId}
      LIMIT 3
    `);

    // Check pgvector extension
    const pgvectorCheck = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM pg_extension WHERE extname = 'vector'
      ) as exists
    `);

    // Check documents status for this case
    const docsStatus = await db.execute(sql`
      SELECT
        COUNT(*) as total,
        COUNT(category) as classified,
        COUNT(*) - COUNT(category) as unclassified
      FROM documents
      WHERE case_id = ${caseId}
    `);

    // Get document details
    const docDetails = await db.execute(sql`
      SELECT id, file_name, category, subtype, storage_path
      FROM documents
      WHERE case_id = ${caseId}
      LIMIT 5
    `);

    // Check ALL documents in the system (to see if case_id mismatch)
    const allDocs = await db.execute(sql`
      SELECT case_id, COUNT(*) as count
      FROM documents
      GROUP BY case_id
      LIMIT 10
    `);

    // Check if case exists
    const caseCheck = await db.execute(sql`
      SELECT id, name, user_id FROM cases WHERE id = ${caseId}
    `);

    // Check ALL cases to see what exists
    const allCases = await db.execute(sql`
      SELECT id, name FROM cases LIMIT 10
    `);

    // The result from postgres.js is the array directly
    const tableExists = Array.isArray(tableCheck) ? tableCheck[0]?.exists : (tableCheck as any).rows?.[0]?.exists;
    const count = Array.isArray(chunkCount) ? chunkCount[0]?.count : (chunkCount as any).rows?.[0]?.count;
    const samples = Array.isArray(sampleChunk) ? sampleChunk : (sampleChunk as any).rows || [];
    const pgvectorExists = Array.isArray(pgvectorCheck) ? pgvectorCheck[0]?.exists : (pgvectorCheck as any).rows?.[0]?.exists;
    const docStats = Array.isArray(docsStatus) ? docsStatus[0] : (docsStatus as any).rows?.[0];
    const docs = Array.isArray(docDetails) ? docDetails : (docDetails as any).rows || [];

    const allDocsResult = Array.isArray(allDocs) ? allDocs : (allDocs as any).rows || [];
    const caseData = Array.isArray(caseCheck) ? caseCheck[0] : (caseCheck as any).rows?.[0];
    const allCasesResult = Array.isArray(allCases) ? allCases : (allCases as any).rows || [];

    return NextResponse.json({
      caseId,
      tableExists,
      pgvectorExists,
      chunkCount: count,
      sampleChunks: samples,
      documents: {
        stats: docStats,
        samples: docs,
      },
      caseInfo: caseData || "NOT FOUND - case does not exist with this ID",
      allCases: allCasesResult,
      allDocumentsByCaseId: allDocsResult,
      debug: {
        tableCheckType: typeof tableCheck,
        tableCheckIsArray: Array.isArray(tableCheck),
      }
    });
  } catch (error: any) {
    console.error("[Debug] Error:", error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
