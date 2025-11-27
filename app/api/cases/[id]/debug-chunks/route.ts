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

    // The result from postgres.js is the array directly
    const tableExists = Array.isArray(tableCheck) ? tableCheck[0]?.exists : (tableCheck as any).rows?.[0]?.exists;
    const count = Array.isArray(chunkCount) ? chunkCount[0]?.count : (chunkCount as any).rows?.[0]?.count;
    const samples = Array.isArray(sampleChunk) ? sampleChunk : (sampleChunk as any).rows || [];
    const pgvectorExists = Array.isArray(pgvectorCheck) ? pgvectorCheck[0]?.exists : (pgvectorCheck as any).rows?.[0]?.exists;

    return NextResponse.json({
      caseId,
      tableExists,
      pgvectorExists,
      chunkCount: count,
      sampleChunks: samples,
      debug: {
        tableCheckType: typeof tableCheck,
        tableCheckIsArray: Array.isArray(tableCheck),
        rawTableCheck: tableCheck,
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
