/**
 * Gap Detection Algorithm
 * Phase 7: Case Insights & Gap Detection
 *
 * Identifies missing document types for family law cases
 */

// Family law document checklist by category
export const FAMILY_LAW_DOCUMENT_CHECKLIST = {
  Financial: {
    required: [
      { type: "Tax Return", description: "Federal/State Tax Returns", yearsNeeded: 3 },
      { type: "W-2", description: "W-2 Wage Statements", yearsNeeded: 3 },
      { type: "Bank Statement", description: "Bank Account Statements", monthsNeeded: 12 },
      { type: "Pay Stub", description: "Pay Stubs/Income Verification", monthsNeeded: 3 },
      { type: "Credit Card Statement", description: "Credit Card Statements", monthsNeeded: 6 },
    ],
    optional: [
      { type: "Investment Statement", description: "401k/IRA/Brokerage Statements" },
      { type: "Retirement Account", description: "Pension/Retirement Documents" },
      { type: "Business Records", description: "Business Financial Records" },
      { type: "Loan Document", description: "Loan/Debt Documentation" },
    ],
  },
  Legal: {
    required: [
      { type: "Marriage Certificate", description: "Marriage Certificate" },
      { type: "Prenuptial Agreement", description: "Prenuptial/Postnuptial Agreement" },
    ],
    optional: [
      { type: "Court Order", description: "Existing Court Orders" },
      { type: "Divorce Decree", description: "Prior Divorce Decrees" },
      { type: "Custody Agreement", description: "Custody/Parenting Agreements" },
      { type: "Restraining Order", description: "Protective Orders" },
    ],
  },
  Property: {
    required: [
      { type: "Property Deed", description: "Real Estate Deeds" },
      { type: "Mortgage Statement", description: "Mortgage Statements" },
    ],
    optional: [
      { type: "Vehicle Title", description: "Vehicle Titles/Registrations" },
      { type: "Appraisal", description: "Property Appraisals" },
      { type: "Insurance Policy", description: "Insurance Policies" },
    ],
  },
  Personal: {
    required: [
      { type: "Identification", description: "Driver's License/ID" },
    ],
    optional: [
      { type: "Birth Certificate", description: "Birth Certificates (for children)" },
      { type: "Social Security Card", description: "Social Security Cards" },
      { type: "Passport", description: "Passport" },
    ],
  },
  Employment: {
    required: [
      { type: "Employment Contract", description: "Employment Agreement" },
    ],
    optional: [
      { type: "Benefits Statement", description: "Employee Benefits Summary" },
      { type: "Stock Options", description: "Stock Options/Equity Documents" },
      { type: "Severance Agreement", description: "Severance Agreements" },
    ],
  },
  Medical: {
    required: [],
    optional: [
      { type: "Medical Records", description: "Medical Records (if relevant)" },
      { type: "Health Insurance", description: "Health Insurance Documents" },
      { type: "Medical Bills", description: "Medical Bills/Expenses" },
    ],
  },
};

export interface DocumentInfo {
  id: string;
  fileName: string;
  category: string | null;
  subtype: string | null;
  metadata: {
    startDate?: string;
    endDate?: string;
    [key: string]: any;
  } | null;
}

export interface MissingDocument {
  type: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
  reason: string;
}

export interface DateGap {
  type: string;
  category: string;
  missingPeriod: string;
  startDate: string;
  endDate: string;
}

export interface GapDetectionResult {
  missingDocuments: MissingDocument[];
  dateGaps: DateGap[];
  recommendations: string[];
  completionScore: number; // 0-100
  categoryScores: Record<string, { score: number; found: number; required: number }>;
}

/**
 * Detect missing documents and gaps in a case
 */
export function detectDocumentGaps(documents: DocumentInfo[]): GapDetectionResult {
  const missingDocuments: MissingDocument[] = [];
  const dateGaps: DateGap[] = [];
  const recommendations: string[] = [];
  const categoryScores: Record<string, { score: number; found: number; required: number }> = {};

  // Group documents by category and subtype
  const docsByCategory: Record<string, DocumentInfo[]> = {};
  const docsBySubtype: Record<string, DocumentInfo[]> = {};

  for (const doc of documents) {
    if (doc.category) {
      if (!docsByCategory[doc.category]) {
        docsByCategory[doc.category] = [];
      }
      docsByCategory[doc.category].push(doc);
    }
    if (doc.subtype) {
      const key = `${doc.category}:${doc.subtype}`;
      if (!docsBySubtype[key]) {
        docsBySubtype[key] = [];
      }
      docsBySubtype[key].push(doc);
    }
  }

  // Check each category for missing required documents
  for (const [category, checklist] of Object.entries(FAMILY_LAW_DOCUMENT_CHECKLIST)) {
    const categoryDocs = docsByCategory[category] || [];
    let foundCount = 0;
    const requiredCount = checklist.required.length;

    for (const required of checklist.required) {
      // Check if we have this document type
      const found = categoryDocs.some((doc) => {
        const subtypeLower = (doc.subtype || "").toLowerCase();
        const typeLower = required.type.toLowerCase();
        return subtypeLower.includes(typeLower) || typeLower.includes(subtypeLower);
      });

      if (found) {
        foundCount++;
      } else {
        missingDocuments.push({
          type: required.type,
          description: required.description,
          category,
          priority: "high",
          reason: `Required for ${category.toLowerCase()} documentation`,
        });
      }
    }

    // Calculate category score
    categoryScores[category] = {
      score: requiredCount > 0 ? Math.round((foundCount / requiredCount) * 100) : 100,
      found: foundCount,
      required: requiredCount,
    };
  }

  // Check for date gaps in recurring documents (bank statements, pay stubs)
  const recurringTypes = ["Bank Statement", "Pay Stub", "Credit Card Statement"];

  for (const docType of recurringTypes) {
    const key = `Financial:${docType}`;
    const docs = docsBySubtype[key] || [];

    if (docs.length > 0) {
      // Extract dates and find gaps
      const dates: Date[] = [];
      for (const doc of docs) {
        if (doc.metadata?.startDate) {
          dates.push(new Date(doc.metadata.startDate));
        }
        if (doc.metadata?.endDate) {
          dates.push(new Date(doc.metadata.endDate));
        }
      }

      if (dates.length >= 2) {
        dates.sort((a, b) => a.getTime() - b.getTime());

        // Check for gaps > 60 days
        for (let i = 1; i < dates.length; i++) {
          const diffDays = (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > 60) {
            const startGap = dates[i - 1];
            const endGap = dates[i];
            dateGaps.push({
              type: docType,
              category: "Financial",
              missingPeriod: `${formatMonth(startGap)} - ${formatMonth(endGap)}`,
              startDate: startGap.toISOString(),
              endDate: endGap.toISOString(),
            });
          }
        }
      }
    }
  }

  // Generate recommendations based on findings
  if (missingDocuments.length > 0) {
    const highPriority = missingDocuments.filter((d) => d.priority === "high");
    if (highPriority.length > 0) {
      recommendations.push(
        `Obtain ${highPriority.length} critical missing documents: ${highPriority.slice(0, 3).map((d) => d.type).join(", ")}${highPriority.length > 3 ? "..." : ""}`
      );
    }
  }

  if (dateGaps.length > 0) {
    recommendations.push(
      `Fill ${dateGaps.length} date gap(s) in financial records to ensure complete coverage`
    );
  }

  // Check for low confidence documents
  const lowConfidenceDocs = documents.filter((d) => d.category && d.metadata);
  if (lowConfidenceDocs.length > 0) {
    recommendations.push(
      "Review AI-classified documents to verify accuracy"
    );
  }

  // Financial completeness check
  const financialDocs = docsByCategory["Financial"] || [];
  if (financialDocs.length < 5) {
    recommendations.push(
      "Financial documentation appears incomplete. Consider adding more bank statements, tax returns, or pay stubs."
    );
  }

  // Calculate overall completion score
  const totalRequired = Object.values(categoryScores).reduce((sum, c) => sum + c.required, 0);
  const totalFound = Object.values(categoryScores).reduce((sum, c) => sum + c.found, 0);
  const completionScore = totalRequired > 0 ? Math.round((totalFound / totalRequired) * 100) : 0;

  return {
    missingDocuments,
    dateGaps,
    recommendations,
    completionScore,
    categoryScores,
  };
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * Get document checklist for display
 */
export function getDocumentChecklist() {
  const checklist: Array<{
    category: string;
    type: string;
    description: string;
    required: boolean;
  }> = [];

  for (const [category, items] of Object.entries(FAMILY_LAW_DOCUMENT_CHECKLIST)) {
    for (const item of items.required) {
      checklist.push({
        category,
        type: item.type,
        description: item.description,
        required: true,
      });
    }
    for (const item of items.optional) {
      checklist.push({
        category,
        type: item.type,
        description: item.description,
        required: false,
      });
    }
  }

  return checklist;
}
