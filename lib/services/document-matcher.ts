/**
 * Document Matcher Service
 * Phase 4: Matches case documents to RFP/discovery requests
 *
 * Uses multiple signals to determine match:
 * - Category matching
 * - Keyword extraction and matching
 * - Date range analysis
 * - Semantic similarity (via category/subtype)
 */

interface Document {
  id: string;
  fileName: string;
  category: string | null;
  subtype: string | null;
  confidence: number | null;
  metadata?: {
    summary?: string;
    startDate?: string;
    endDate?: string;
    parties?: string[];
    amounts?: number[];
    [key: string]: any;
  } | null;
}

interface DiscoveryRequest {
  id?: string;
  type: "RFP" | "Interrogatory";
  number: number;
  text: string;
  categoryHint: string | null;
}

interface MatchedDocument {
  id: string;
  fileName: string;
  category: string | null;
  subtype: string | null;
  confidence: number | null;
  matchScore: number;
  matchReason: string;
}

interface MatchResult {
  request: DiscoveryRequest;
  status: "complete" | "partial" | "incomplete";
  completionPercentage: number;
  matchingDocuments: MatchedDocument[];
}

// Category keywords mapping
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Financial: [
    "bank", "statement", "account", "deposit", "withdrawal", "balance",
    "tax", "return", "w-2", "w2", "1099", "income", "expense",
    "credit", "card", "loan", "mortgage", "debt", "payment",
    "paycheck", "pay stub", "salary", "wage", "earnings",
    "investment", "401k", "ira", "stock", "bond", "retirement",
    "financial", "money", "funds", "assets", "liabilities"
  ],
  Medical: [
    "medical", "health", "doctor", "hospital", "clinic", "prescription",
    "diagnosis", "treatment", "therapy", "insurance", "bill",
    "record", "chart", "lab", "test", "result", "medication",
    "mental health", "counseling", "psychiatrist", "psychologist"
  ],
  Legal: [
    "court", "order", "custody", "visitation", "parenting", "divorce",
    "petition", "motion", "judgment", "decree", "agreement",
    "police", "arrest", "report", "restraining", "protective",
    "attorney", "lawyer", "legal", "settlement", "mediation"
  ],
  Communications: [
    "email", "text", "message", "letter", "correspondence", "communication",
    "screenshot", "chat", "voicemail", "phone", "call", "sms"
  ],
  Property: [
    "property", "deed", "title", "house", "home", "real estate",
    "vehicle", "car", "auto", "registration", "insurance",
    "appraisal", "valuation", "asset"
  ],
  Employment: [
    "employment", "employer", "job", "work", "company", "business",
    "contract", "offer", "termination", "benefits", "hr",
    "schedule", "hours", "overtime"
  ],
  Personal: [
    "birth", "certificate", "marriage", "license", "id", "identification",
    "passport", "driver", "social security", "ssn"
  ],
  Parenting: [
    "child", "children", "school", "education", "daycare", "childcare",
    "extracurricular", "activity", "medical", "pediatric", "custody",
    "parenting", "visitation", "schedule"
  ]
};

// Date pattern keywords
const DATE_KEYWORDS = [
  "from", "to", "between", "since", "through", "during",
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
  "2020", "2021", "2022", "2023", "2024", "2025"
];

/**
 * Extract keywords from request text
 */
function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2);

  // Remove common stopwords
  const stopwords = new Set([
    "the", "and", "for", "are", "but", "not", "you", "all", "can",
    "her", "was", "one", "our", "out", "has", "have", "been", "were",
    "any", "each", "which", "their", "will", "there", "than", "that",
    "this", "with", "from", "your", "they", "been", "have", "make",
    "more", "when", "other", "please", "provide", "include", "including",
    "request", "production", "interrogatory", "documents", "document"
  ]);

  return words.filter(w => !stopwords.has(w));
}

/**
 * Detect category from request text
 */
function detectCategory(text: string): string | null {
  const lowerText = text.toLowerCase();

  let bestCategory: string | null = null;
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score += keyword.length; // Weight by keyword length
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestScore > 3 ? bestCategory : null;
}

/**
 * Calculate match score between a request and document
 */
function calculateMatchScore(request: DiscoveryRequest, document: Document): {
  score: number;
  reason: string;
} {
  let score = 0;
  const reasons: string[] = [];

  const requestText = request.text.toLowerCase();
  const requestKeywords = extractKeywords(request.text);
  const detectedCategory = request.categoryHint || detectCategory(request.text);

  // 1. Category match (40 points max)
  if (document.category) {
    if (detectedCategory && document.category.toLowerCase() === detectedCategory.toLowerCase()) {
      score += 40;
      reasons.push("Category match");
    } else if (detectedCategory && document.category.toLowerCase().includes(detectedCategory.toLowerCase())) {
      score += 25;
      reasons.push("Partial category match");
    }
  }

  // 2. Subtype match (20 points max)
  if (document.subtype) {
    const subtypeLower = document.subtype.toLowerCase();
    for (const keyword of requestKeywords) {
      if (subtypeLower.includes(keyword)) {
        score += 10;
        reasons.push(`Subtype: ${document.subtype}`);
        break;
      }
    }
  }

  // 3. Filename match (15 points max)
  if (document.fileName) {
    const filenameLower = document.fileName.toLowerCase();
    let filenameMatches = 0;
    for (const keyword of requestKeywords) {
      if (filenameLower.includes(keyword)) {
        filenameMatches++;
      }
    }
    if (filenameMatches > 0) {
      score += Math.min(15, filenameMatches * 5);
      reasons.push("Filename match");
    }
  }

  // 4. Summary/metadata match (15 points max)
  if (document.metadata?.summary) {
    const summaryLower = document.metadata.summary.toLowerCase();
    let summaryMatches = 0;
    for (const keyword of requestKeywords) {
      if (summaryLower.includes(keyword)) {
        summaryMatches++;
      }
    }
    if (summaryMatches > 0) {
      score += Math.min(15, summaryMatches * 3);
      reasons.push("Content match");
    }
  }

  // 5. Date range consideration (10 points max)
  const hasDateRequest = DATE_KEYWORDS.some(kw => requestText.includes(kw));
  if (hasDateRequest && document.metadata?.startDate) {
    score += 10;
    reasons.push("Has date range");
  }

  // Cap score at 100
  score = Math.min(100, score);

  return {
    score,
    reason: reasons.length > 0 ? reasons[0] : "General match"
  };
}

/**
 * Match documents to a single request
 */
export function matchDocumentsToRequest(
  request: DiscoveryRequest,
  documents: Document[],
  minScore: number = 30
): MatchResult {
  const matchedDocs: MatchedDocument[] = [];

  for (const doc of documents) {
    // Skip documents without category (not yet classified)
    if (!doc.category) continue;

    const { score, reason } = calculateMatchScore(request, doc);

    if (score >= minScore) {
      matchedDocs.push({
        id: doc.id,
        fileName: doc.fileName,
        category: doc.category,
        subtype: doc.subtype,
        confidence: doc.confidence,
        matchScore: score,
        matchReason: reason
      });
    }
  }

  // Sort by match score descending
  matchedDocs.sort((a, b) => b.matchScore - a.matchScore);

  // Determine status and completion percentage
  let status: "complete" | "partial" | "incomplete";
  let completionPercentage: number;

  if (matchedDocs.length === 0) {
    status = "incomplete";
    completionPercentage = 0;
  } else if (matchedDocs.some(d => d.matchScore >= 70)) {
    status = "complete";
    completionPercentage = 100;
  } else {
    status = "partial";
    // Calculate based on best match score
    const bestScore = matchedDocs[0]?.matchScore || 0;
    completionPercentage = Math.round(bestScore);
  }

  return {
    request,
    status,
    completionPercentage,
    matchingDocuments: matchedDocs
  };
}

/**
 * Match documents to multiple requests
 */
export function matchDocumentsToRequests(
  requests: DiscoveryRequest[],
  documents: Document[],
  minScore: number = 30
): MatchResult[] {
  return requests.map(request => matchDocumentsToRequest(request, documents, minScore));
}

/**
 * Calculate overall compliance stats
 */
export function calculateComplianceStats(results: MatchResult[], totalDocuments: number) {
  const totalRequests = results.length;
  const completeRequests = results.filter(r => r.status === "complete").length;
  const partialRequests = results.filter(r => r.status === "partial").length;
  const incompleteRequests = results.filter(r => r.status === "incomplete").length;

  // Calculate overall score
  let overallComplianceScore = 0;
  if (totalRequests > 0) {
    const totalCompletion = results.reduce((sum, r) => sum + r.completionPercentage, 0);
    overallComplianceScore = Math.round(totalCompletion / totalRequests);
  }

  // Count documents with matches
  const matchedDocIds = new Set(
    results.flatMap(r => r.matchingDocuments.map(d => d.id))
  );
  const documentsWithMatches = matchedDocIds.size;
  const unmatchedDocuments = totalDocuments - documentsWithMatches;

  return {
    totalRequests,
    completeRequests,
    partialRequests,
    incompleteRequests,
    overallComplianceScore,
    documentsWithMatches,
    unmatchedDocuments,
    totalDocuments
  };
}
