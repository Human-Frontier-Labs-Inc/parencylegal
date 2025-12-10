/**
 * Document Content Proxy API
 * GET /api/documents/:id/content
 *
 * Proxies document content to handle CORS issues with external storage.
 * This allows pdf.js to load PDFs from Vercel Blob or other external sources.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { documentsTable } from "@/db/schema/documents-schema";
import { casesTable } from "@/db/schema/cases-schema";
import { eq, and } from "drizzle-orm";
import { getAccessTokenForUser } from "@/lib/dropbox/folders";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get document with case verification
    const [document] = await db
      .select({
        id: documentsTable.id,
        storagePath: documentsTable.storagePath,
        storageUrl: documentsTable.storageUrl,
        dropboxPath: documentsTable.dropboxPath,
        dropboxFilePath: documentsTable.dropboxFilePath,
        fileName: documentsTable.fileName,
        fileType: documentsTable.fileType,
        caseId: documentsTable.caseId,
      })
      .from(documentsTable)
      .innerJoin(casesTable, eq(documentsTable.caseId, casesTable.id))
      .where(
        and(
          eq(documentsTable.id, id),
          eq(casesTable.userId, userId)
        )
      );

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    let sourceUrl: string | null = null;

    // Option 1: Vercel Blob URL
    if (document.storageUrl) {
      sourceUrl = document.storageUrl;
    }
    // Option 2: Legacy storagePath as URL
    else if (document.storagePath && document.storagePath.startsWith("http")) {
      sourceUrl = document.storagePath;
    }
    // Option 3: Dropbox temporary link
    else if (document.dropboxPath || document.dropboxFilePath) {
      try {
        const accessToken = await getAccessTokenForUser(userId);
        const dropboxPath = document.dropboxFilePath || document.dropboxPath;

        const response = await fetch(
          "https://api.dropboxapi.com/2/files/get_temporary_link",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              path: dropboxPath,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          sourceUrl = data.link;
        }
      } catch (dropboxError) {
        console.error("[DocumentContent] Dropbox error:", dropboxError);
      }
    }

    if (!sourceUrl) {
      return NextResponse.json(
        { error: "No document source available" },
        { status: 404 }
      );
    }

    // Fetch the document content
    const contentResponse = await fetch(sourceUrl);

    if (!contentResponse.ok) {
      console.error("[DocumentContent] Failed to fetch:", contentResponse.status);
      return NextResponse.json(
        { error: "Failed to fetch document" },
        { status: 502 }
      );
    }

    const contentType = contentResponse.headers.get("content-type") || "application/pdf";
    const buffer = await contentResponse.arrayBuffer();

    // Return the content with proper headers for pdf.js
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${document.fileName}"`,
        "Cache-Control": "private, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[DocumentContent] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
