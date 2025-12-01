/**
 * Case Export API
 * POST /api/cases/:id/export - Generate PDF export
 * GET /api/cases/:id/export - List export history
 *
 * Phase 12.4: PDF Export System
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable, documentsTable } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { createExportBundle, ExportDocument, ExportOptions } from "@/lib/pdf/export-service";
import { getAccessTokenForUser } from "@/lib/dropbox/folders";

/**
 * Fetch PDF bytes for a document from Dropbox or Supabase
 */
async function fetchDocumentPdfBytes(
  userId: string,
  dropboxPath: string | null,
  storagePath: string | null
): Promise<Uint8Array | null> {
  // Try Dropbox first
  if (dropboxPath) {
    try {
      const accessToken = await getAccessTokenForUser(userId);
      const response = await fetch("https://content.dropboxapi.com/2/files/download", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Dropbox-API-Arg": JSON.stringify({ path: dropboxPath }),
        },
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return new Uint8Array(arrayBuffer);
      }
    } catch (error) {
      console.error("Failed to fetch from Dropbox:", error);
    }
  }

  // TODO: Try Supabase storage if no Dropbox path
  // For now, return null if Dropbox fetch fails
  return null;
}

/**
 * POST /api/cases/:id/export
 * Generate a PDF export bundle
 */
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
    const body = await request.json();
    const {
      exportMode = "by_category",
      discoveryRequestId,
      documentIds, // Optional: specific documents to export
    } = body;

    // Verify case ownership
    const [caseRecord] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Get documents to export
    let documentsQuery = db
      .select({
        id: documentsTable.id,
        fileName: documentsTable.fileName,
        fileType: documentsTable.fileType,
        category: documentsTable.category,
        subtype: documentsTable.subtype,
        documentDate: documentsTable.documentDate,
        dropboxPath: documentsTable.dropboxPath,
        dropboxFilePath: documentsTable.dropboxFilePath,
        storagePath: documentsTable.storagePath,
      })
      .from(documentsTable)
      .where(eq(documentsTable.caseId, caseId));

    let documents = await documentsQuery;

    // Filter by specific document IDs if provided
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      documents = documents.filter((doc) => documentIds.includes(doc.id));
    }

    // Filter to only PDF files
    documents = documents.filter(
      (doc) => doc.fileType?.toLowerCase() === "pdf"
    );

    if (documents.length === 0) {
      return NextResponse.json(
        { error: "No PDF documents found to export" },
        { status: 400 }
      );
    }

    // Fetch PDF bytes for each document
    const exportDocuments: ExportDocument[] = [];
    const errors: string[] = [];

    for (const doc of documents) {
      const dropboxPath = doc.dropboxFilePath || doc.dropboxPath;
      const pdfBytes = await fetchDocumentPdfBytes(
        userId,
        dropboxPath,
        doc.storagePath
      );

      if (pdfBytes) {
        exportDocuments.push({
          id: doc.id,
          fileName: doc.fileName,
          category: doc.category,
          subtype: doc.subtype,
          documentDate: doc.documentDate,
          pdfBytes,
        });
      } else {
        errors.push(doc.fileName);
      }
    }

    if (exportDocuments.length === 0) {
      return NextResponse.json(
        {
          error: "Failed to fetch any documents",
          details: errors,
        },
        { status: 500 }
      );
    }

    // Build export options
    const exportOptions: ExportOptions = {
      caseId,
      caseName: caseRecord.name,
      clientName: caseRecord.clientName || undefined,
      opposingParty: caseRecord.opposingParty || undefined,
      caseNumber: caseRecord.caseNumber || undefined,
      exportMode,
      preparedDate: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };

    // Generate the export bundle
    const result = await createExportBundle(exportDocuments, exportOptions);

    // Return the PDF as a downloadable file
    const fileName = `${caseRecord.name.replace(/[^a-zA-Z0-9]/g, "_")}_Export_${
      new Date().toISOString().split("T")[0]
    }.pdf`;

    return new NextResponse(result.pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Page-Count": result.pageCount.toString(),
        "X-Document-Count": result.documentCount.toString(),
        "X-Errors": errors.length > 0 ? errors.join(", ") : "",
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: error.message || "Export failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cases/:id/export
 * Get export status/info (for future: export history)
 */
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

    // Verify case ownership
    const [caseRecord] = await db
      .select()
      .from(casesTable)
      .where(and(eq(casesTable.id, caseId), eq(casesTable.userId, userId)));

    if (!caseRecord) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Get document counts for export preview
    const documents = await db
      .select({
        id: documentsTable.id,
        fileType: documentsTable.fileType,
        category: documentsTable.category,
      })
      .from(documentsTable)
      .where(eq(documentsTable.caseId, caseId));

    const pdfDocuments = documents.filter(
      (doc) => doc.fileType?.toLowerCase() === "pdf"
    );

    // Group by category
    const byCategory = pdfDocuments.reduce((acc, doc) => {
      const cat = doc.category || "Uncategorized";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      totalDocuments: documents.length,
      pdfDocuments: pdfDocuments.length,
      byCategory,
      canExport: pdfDocuments.length > 0,
    });
  } catch (error: any) {
    console.error("Export info error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get export info" },
      { status: 500 }
    );
  }
}
