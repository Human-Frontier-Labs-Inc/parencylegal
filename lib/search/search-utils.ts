/**
 * Search Utilities
 * Phase 9: Timeline, Search & Export
 *
 * Helper functions for full-text and hybrid search
 */

// Types
export interface SearchResult {
  id: string;
  documentId: string;
  fileName: string;
  category: string | null;
  subtype: string | null;
  relevanceScore: number;
  matchType: "full-text" | "semantic" | "both";
  snippet: string;
  highlights: string[];
  metadata: Record<string, any> | null;
}

/**
 * Build PostgreSQL tsquery from search query
 * Handles:
 * - Simple terms: "bank statement" -> "bank & statement"
 * - OR operator: "bank OR credit" -> "bank | credit"
 * - Phrase matching: '"bank statement"' -> "bank <-> statement"
 * - NOT operator: "bank -savings" -> "bank & !savings"
 */
export function buildTsQuery(query: string): string {
  if (!query || query.trim() === "") {
    return "";
  }

  let result = query.trim();

  // Handle phrase queries (text in quotes)
  const phraseRegex = /"([^"]+)"/g;
  result = result.replace(phraseRegex, (_, phrase) => {
    // Convert phrase to adjacent words: "bank statement" -> "bank <-> statement"
    return phrase
      .split(/\s+/)
      .filter((w: string) => w.length > 0)
      .join(" <-> ");
  });

  // Handle OR operator
  result = result.replace(/\bOR\b/gi, "|");

  // Handle NOT operator (minus sign)
  result = result.replace(/\s+-(\w+)/g, " & !$1");

  // Escape special characters (except operators we use)
  result = result.replace(/[@.#$%^*()[\]{}\\;,<>]/g, "");

  // Convert remaining spaces to AND
  result = result
    .split(/\s+/)
    .filter((term) => term.length > 0)
    .join(" & ");

  // Clean up multiple operators
  result = result.replace(/[&|]+\s*[&|]+/g, " & ");
  result = result.replace(/^\s*[&|]\s*/, "");
  result = result.replace(/\s*[&|]\s*$/, "");

  return result;
}

/**
 * Extract a snippet around the match location
 */
export function extractSnippet(
  content: string,
  query: string,
  contextChars: number = 50
): string {
  if (!content || !query) return "";

  // Find the first occurrence of any query term
  const terms = query
    .toLowerCase()
    .replace(/["']/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !["and", "or", "not", "the", "a"].includes(t));

  if (terms.length === 0) return "";

  const lowerContent = content.toLowerCase();
  let matchIndex = -1;

  for (const term of terms) {
    const idx = lowerContent.indexOf(term);
    if (idx !== -1) {
      if (matchIndex === -1 || idx < matchIndex) {
        matchIndex = idx;
      }
    }
  }

  if (matchIndex === -1) return "";

  // Extract context around match
  const start = Math.max(0, matchIndex - contextChars);
  const end = Math.min(content.length, matchIndex + contextChars + terms[0].length);

  let snippet = content.slice(start, end);

  // Add ellipsis if truncated
  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";

  return snippet;
}

/**
 * Wrap matching terms in highlight tags
 */
export function highlightMatches(text: string, query: string): string {
  if (!text || !query) return text;

  const terms = query
    .toLowerCase()
    .replace(/["']/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !["and", "or", "not", "the", "a"].includes(t));

  if (terms.length === 0) return text;

  let result = text;

  for (const term of terms) {
    // Case-insensitive replacement with original case preserved
    const regex = new RegExp(`(${escapeRegex(term)})`, "gi");
    result = result.replace(regex, "<mark>$1</mark>");
  }

  return result;
}

/**
 * Calculate relevance score combining multiple factors
 */
export function calculateRelevanceScore(
  text: string,
  query: string,
  semanticSimilarity: number
): number {
  if (!text || !query) return semanticSimilarity;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Factor 1: Semantic similarity (0-1)
  let score = semanticSimilarity * 0.5;

  // Factor 2: Exact match bonus
  if (lowerText.includes(lowerQuery)) {
    score += 0.25;
  }

  // Factor 3: Term coverage
  const terms = lowerQuery.split(/\s+/).filter((t) => t.length > 2);
  const matchedTerms = terms.filter((t) => lowerText.includes(t));
  const termCoverage = terms.length > 0 ? matchedTerms.length / terms.length : 0;
  score += termCoverage * 0.25;

  return Math.min(1, Math.max(0, score));
}

/**
 * Deduplicate results by documentId, keeping highest score
 */
export function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const byDocId = new Map<string, SearchResult>();

  for (const result of results) {
    const existing = byDocId.get(result.documentId);

    if (!existing || result.relevanceScore > existing.relevanceScore) {
      byDocId.set(result.documentId, result);
    }
  }

  return Array.from(byDocId.values()).sort(
    (a, b) => b.relevanceScore - a.relevanceScore
  );
}

/**
 * Combine full-text and semantic search results
 */
export function combineSearchResults(
  fullTextResults: SearchResult[],
  semanticResults: SearchResult[]
): SearchResult[] {
  const combined = new Map<string, SearchResult>();

  // Add full-text results
  for (const result of fullTextResults) {
    combined.set(result.documentId, { ...result });
  }

  // Merge semantic results
  for (const result of semanticResults) {
    const existing = combined.get(result.documentId);

    if (existing) {
      // Document appears in both - mark as "both" and take best score
      combined.set(result.documentId, {
        ...existing,
        matchType: "both",
        relevanceScore: Math.max(existing.relevanceScore, result.relevanceScore),
        // Merge highlights
        highlights: [...new Set([...existing.highlights, ...result.highlights])],
        // Keep better snippet (longer usually)
        snippet:
          result.snippet.length > existing.snippet.length
            ? result.snippet
            : existing.snippet,
      });
    } else {
      combined.set(result.documentId, { ...result });
    }
  }

  // Sort by relevance, with "both" matches getting a boost
  return Array.from(combined.values()).sort((a, b) => {
    // Boost "both" matches by 10%
    const scoreA = a.matchType === "both" ? a.relevanceScore * 1.1 : a.relevanceScore;
    const scoreB = b.matchType === "both" ? b.relevanceScore * 1.1 : b.relevanceScore;
    return scoreB - scoreA;
  });
}

/**
 * Escape special regex characters
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
