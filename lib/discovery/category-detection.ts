/**
 * Category Detection for Discovery Requests
 * Phase 8: Discovery Request Tracking
 *
 * Auto-detects document category from request text
 */

// Keywords mapped to categories
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Financial: [
    "bank",
    "statement",
    "account",
    "tax",
    "return",
    "w-2",
    "w2",
    "1099",
    "pay stub",
    "paystub",
    "paycheck",
    "income",
    "wage",
    "salary",
    "credit card",
    "loan",
    "debt",
    "mortgage",
    "investment",
    "401k",
    "ira",
    "retirement",
    "brokerage",
    "stock",
    "bond",
    "mutual fund",
    "financial",
    "checking",
    "savings",
  ],
  Medical: [
    "medical",
    "health",
    "hospital",
    "doctor",
    "physician",
    "prescription",
    "pharmacy",
    "insurance",
    "bill",
    "treatment",
    "diagnosis",
    "surgery",
    "therapy",
    "mental health",
    "dental",
    "vision",
  ],
  Employment: [
    "employment",
    "employer",
    "employee",
    "job",
    "work",
    "contract",
    "agreement",
    "offer letter",
    "termination",
    "severance",
    "benefits",
    "bonus",
    "commission",
    "performance review",
  ],
  Property: [
    "property",
    "deed",
    "title",
    "real estate",
    "house",
    "home",
    "land",
    "vehicle",
    "car",
    "auto",
    "boat",
    "appraisal",
    "assessment",
    "valuation",
  ],
  Legal: [
    "marriage",
    "certificate",
    "prenup",
    "prenuptial",
    "postnuptial",
    "custody",
    "divorce",
    "court order",
    "judgment",
    "decree",
    "restraining order",
    "protective order",
  ],
  Personal: [
    "birth certificate",
    "passport",
    "id",
    "identification",
    "driver",
    "license",
    "social security",
    "ssn",
    "immigration",
    "visa",
    "citizenship",
  ],
};

/**
 * Detect document category from request text
 * Returns the most likely category or null if no match
 */
export function detectCategoryFromText(text: string): string | null {
  const normalizedText = text.toLowerCase();

  // Count matches for each category
  const scores: Record<string, number> = {};

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[category] = 0;

    for (const keyword of keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        scores[category]++;
      }
    }
  }

  // Find category with highest score
  let maxScore = 0;
  let bestCategory: string | null = null;

  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestCategory = category;
    }
  }

  // Only return if we have at least one match
  return maxScore > 0 ? bestCategory : null;
}

/**
 * Get all matching categories with scores
 */
export function detectAllCategories(
  text: string
): Array<{ category: string; score: number; keywords: string[] }> {
  const normalizedText = text.toLowerCase();
  const results: Array<{ category: string; score: number; keywords: string[] }> = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matchedKeywords: string[] = [];

    for (const keyword of keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > 0) {
      results.push({
        category,
        score: matchedKeywords.length,
        keywords: matchedKeywords,
      });
    }
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score);
}

/**
 * Extract keywords from request text for semantic matching
 */
export function extractKeywords(text: string): string[] {
  const normalizedText = text.toLowerCase();
  const allKeywords: string[] = [];

  for (const keywords of Object.values(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        allKeywords.push(keyword);
      }
    }
  }

  return [...new Set(allKeywords)]; // Deduplicate
}
