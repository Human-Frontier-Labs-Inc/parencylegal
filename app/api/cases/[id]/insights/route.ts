/**
 * Case Insights API
 * Phase 7: Case Insights & Gap Detection
 *
 * GET /api/cases/:id/insights - Get case insights and gap analysis
 */

import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { casesTable, documentsTable } from "@/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { detectDocumentGaps, getDocumentChecklist } from "@/lib/ai/gap-detection";

export async function GET(
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

    // Get all documents for this case
    const documents = await db
      .select({
        id: documentsTable.id,
        fileName: documentsTable.fileName,
        category: documentsTable.category,
        subtype: documentsTable.subtype,
        confidence: documentsTable.confidence,
        needsReview: documentsTable.needsReview,
        reviewedAt: documentsTable.reviewedAt,
        metadata: documentsTable.metadata,
        createdAt: documentsTable.createdAt,
      })
      .from(documentsTable)
      .where(eq(documentsTable.caseId, caseId));

    // Calculate basic stats
    const totalDocuments = documents.length;
    const classifiedDocuments = documents.filter((d) => d.category).length;
    const needsReviewDocuments = documents.filter((d) => d.needsReview).length;
    const reviewedDocuments = documents.filter((d) => d.reviewedAt).length;

    // Calculate category breakdown
    const categoryBreakdown: Record<string, { count: number; subtypes: Record<string, number> }> = {};
    for (const doc of documents) {
      if (doc.category) {
        if (!categoryBreakdown[doc.category]) {
          categoryBreakdown[doc.category] = { count: 0, subtypes: {} };
        }
        categoryBreakdown[doc.category].count++;
        if (doc.subtype) {
          if (!categoryBreakdown[doc.category].subtypes[doc.subtype]) {
            categoryBreakdown[doc.category].subtypes[doc.subtype] = 0;
          }
          categoryBreakdown[doc.category].subtypes[doc.subtype]++;
        }
      }
    }

    // Calculate average confidence
    const classifiedWithConfidence = documents.filter((d) => d.confidence !== null);
    const averageConfidence =
      classifiedWithConfidence.length > 0
        ? Math.round(
            classifiedWithConfidence.reduce((sum, d) => sum + (d.confidence || 0), 0) /
              classifiedWithConfidence.length
          )
        : 0;

    // Calculate confidence distribution
    const confidenceDistribution = {
      high: documents.filter((d) => d.confidence !== null && d.confidence >= 80).length,
      medium: documents.filter(
        (d) => d.confidence !== null && d.confidence >= 60 && d.confidence < 80
      ).length,
      low: documents.filter((d) => d.confidence !== null && d.confidence < 60).length,
    };

    // Run gap detection
    const gapAnalysis = detectDocumentGaps(
      documents.map((d) => ({
        id: d.id,
        fileName: d.fileName,
        category: d.category,
        subtype: d.subtype,
        metadata: d.metadata,
      }))
    );

    // Get recent activity (last 5 documents)
    const recentDocuments = documents
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((d) => ({
        id: d.id,
        fileName: d.fileName,
        category: d.category,
        subtype: d.subtype,
        createdAt: d.createdAt,
      }));

    // Documents needing attention
    const needsAttention = documents
      .filter((d) => d.needsReview && !d.reviewedAt)
      .slice(0, 5)
      .map((d) => ({
        id: d.id,
        fileName: d.fileName,
        category: d.category,
        confidence: d.confidence,
        reason: d.confidence && d.confidence < 60 ? "Low confidence" : "Needs review",
      }));

    // Build response
    const insights = {
      // Summary stats
      summary: {
        totalDocuments,
        classifiedDocuments,
        needsReviewDocuments,
        reviewedDocuments,
        classificationProgress: totalDocuments > 0
          ? Math.round((classifiedDocuments / totalDocuments) * 100)
          : 0,
        reviewProgress: classifiedDocuments > 0
          ? Math.round((reviewedDocuments / classifiedDocuments) * 100)
          : 0,
      },

      // Classification quality
      quality: {
        averageConfidence,
        confidenceDistribution,
      },

      // Category breakdown
      categories: categoryBreakdown,

      // Gap analysis
      gaps: {
        completionScore: gapAnalysis.completionScore,
        missingDocuments: gapAnalysis.missingDocuments,
        dateGaps: gapAnalysis.dateGaps,
        categoryScores: gapAnalysis.categoryScores,
      },

      // Recommendations
      recommendations: gapAnalysis.recommendations,

      // Recent activity
      recentDocuments,

      // Documents needing attention
      needsAttention,

      // Document checklist for reference
      checklist: getDocumentChecklist(),
    };

    return new Response(JSON.stringify(insights), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Insights] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to get insights" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
