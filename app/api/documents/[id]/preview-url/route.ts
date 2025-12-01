/**
 * Document Preview URL API
 * GET /api/documents/:id/preview-url
 *
 * Returns a temporary URL to view the document.
 * Tries Supabase first, falls back to Dropbox temporary link.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { documentsTable } from "@/db/schema/documents-schema";
import { casesTable } from "@/db/schema/cases-schema";
import { eq, and } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { getAccessTokenForUser } from "@/lib/dropbox/folders";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // Option 1: If we have a storageUrl, use it
    if (document.storageUrl) {
      return NextResponse.json({
        url: document.storageUrl,
        source: "storage_url",
        expiresIn: null // Permanent URL
      });
    }

    // Option 2: Try to get signed URL from Supabase Storage
    if (document.storagePath) {
      try {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("case-documents")
          .createSignedUrl(document.storagePath, 3600); // 1 hour expiry

        if (!signedUrlError && signedUrlData?.signedUrl) {
          return NextResponse.json({
            url: signedUrlData.signedUrl,
            source: "supabase_signed",
            expiresIn: 3600
          });
        }

        console.log("[PreviewURL] Supabase signed URL failed:", signedUrlError?.message);
      } catch (supabaseError) {
        console.error("[PreviewURL] Supabase error:", supabaseError);
      }
    }

    // Option 3: Get temporary link from Dropbox
    if (document.dropboxPath || document.dropboxFilePath) {
      try {
        const accessToken = await getAccessTokenForUser(userId);
        const dropboxPath = document.dropboxFilePath || document.dropboxPath;

        const response = await fetch("https://api.dropboxapi.com/2/files/get_temporary_link", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: dropboxPath,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({
            url: data.link,
            source: "dropbox_temporary",
            expiresIn: 14400 // Dropbox temporary links expire in 4 hours
          });
        } else {
          const errorText = await response.text();
          console.error("[PreviewURL] Dropbox temporary link failed:", response.status, errorText);
        }
      } catch (dropboxError) {
        console.error("[PreviewURL] Dropbox error:", dropboxError);
      }
    }

    // No URL available
    return NextResponse.json({
      error: "No preview URL available",
      details: "Document has no storage path or Dropbox path"
    }, { status: 404 });

  } catch (error) {
    console.error("[PreviewURL] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
