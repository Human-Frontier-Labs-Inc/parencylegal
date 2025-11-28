/**
 * AI Document Mapping Tests
 * Phase 8: Discovery Request Tracking
 *
 * TDD Tests for AI-powered document-to-request matching
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock types
interface Document {
  id: string;
  fileName: string;
  category: string | null;
  subtype: string | null;
  metadata: Record<string, any> | null;
}

interface DiscoveryRequest {
  id: string;
  type: "RFP" | "Interrogatory";
  number: number;
  text: string;
  categoryHint: string | null;
}

interface DocumentMapping {
  id: string;
  documentId: string;
  requestId: string;
  source: "ai_suggestion" | "manual_addition";
  confidence: number | null;
  reasoning: string | null;
  status: "suggested" | "accepted" | "rejected";
}

interface SuggestedMapping {
  document: Document;
  confidence: number;
  reasoning: string;
  matchFactors: {
    categoryMatch: boolean;
    keywordMatch: boolean;
    dateMatch: boolean;
    semanticScore: number;
  };
}

interface MappingSuggestionResult {
  requestId: string;
  suggestions: SuggestedMapping[];
  totalDocumentsSearched: number;
}

// Functions to be implemented
async function suggestDocumentsForRequest(
  requestId: string,
  caseId: string,
  userId: string,
  options?: { limit?: number; minConfidence?: number }
): Promise<MappingSuggestionResult> {
  throw new Error("Not implemented");
}

async function createDocumentMapping(
  documentId: string,
  requestId: string,
  userId: string,
  source: "ai_suggestion" | "manual_addition",
  confidence?: number,
  reasoning?: string
): Promise<DocumentMapping> {
  throw new Error("Not implemented");
}

async function getMappingsForRequest(
  requestId: string,
  userId: string
): Promise<DocumentMapping[]> {
  throw new Error("Not implemented");
}

async function getMappingsForDocument(
  documentId: string,
  userId: string
): Promise<DocumentMapping[]> {
  throw new Error("Not implemented");
}

async function updateMappingStatus(
  mappingId: string,
  status: "accepted" | "rejected",
  userId: string
): Promise<DocumentMapping> {
  throw new Error("Not implemented");
}

async function deleteMapping(
  mappingId: string,
  userId: string
): Promise<boolean> {
  throw new Error("Not implemented");
}

async function calculateCoveragePercentage(
  requestId: string,
  userId: string
): Promise<number> {
  throw new Error("Not implemented");
}

describe("AI Document Suggestion", () => {
  const mockUserId = "user_test123";
  const mockCaseId = "case_test456";
  const mockRequestId = "request_test789";

  describe("suggestDocumentsForRequest", () => {
    it("should suggest documents matching category hint", async () => {
      // Setup: Request asks for "all bank statements"
      // Documents in case include bank statements and tax returns

      const result = await suggestDocumentsForRequest(
        mockRequestId,
        mockCaseId,
        mockUserId
      );

      expect(result.requestId).toBe(mockRequestId);
      expect(result.suggestions.length).toBeGreaterThan(0);

      // Bank statements should be suggested with high confidence
      const bankStatements = result.suggestions.filter(
        (s) => s.document.subtype === "Bank Statement"
      );
      expect(bankStatements.length).toBeGreaterThan(0);
      expect(bankStatements[0].confidence).toBeGreaterThan(70);
    });

    it("should use semantic search for keyword matching", async () => {
      // Request: "All documents relating to monthly income"
      // Should match pay stubs, bank statements, employment contracts

      const result = await suggestDocumentsForRequest(
        mockRequestId,
        mockCaseId,
        mockUserId
      );

      // Semantic matching should find related documents
      result.suggestions.forEach((suggestion) => {
        expect(suggestion.matchFactors.semanticScore).toBeDefined();
        expect(suggestion.matchFactors.semanticScore).toBeGreaterThanOrEqual(0);
        expect(suggestion.matchFactors.semanticScore).toBeLessThanOrEqual(1);
      });
    });

    it("should consider date ranges in requests", async () => {
      // Request: "Bank statements from January 2023 to June 2023"
      // Should match documents with dates in that range

      const result = await suggestDocumentsForRequest(
        mockRequestId,
        mockCaseId,
        mockUserId
      );

      // Documents with matching date ranges should have dateMatch = true
      const datedSuggestions = result.suggestions.filter(
        (s) => s.matchFactors.dateMatch
      );

      datedSuggestions.forEach((suggestion) => {
        expect(suggestion.confidence).toBeGreaterThan(50);
      });
    });

    it("should respect confidence threshold", async () => {
      const result = await suggestDocumentsForRequest(
        mockRequestId,
        mockCaseId,
        mockUserId,
        { minConfidence: 80 }
      );

      result.suggestions.forEach((suggestion) => {
        expect(suggestion.confidence).toBeGreaterThanOrEqual(80);
      });
    });

    it("should limit number of suggestions", async () => {
      const result = await suggestDocumentsForRequest(
        mockRequestId,
        mockCaseId,
        mockUserId,
        { limit: 5 }
      );

      expect(result.suggestions.length).toBeLessThanOrEqual(5);
    });

    it("should sort suggestions by confidence (highest first)", async () => {
      const result = await suggestDocumentsForRequest(
        mockRequestId,
        mockCaseId,
        mockUserId
      );

      for (let i = 1; i < result.suggestions.length; i++) {
        expect(result.suggestions[i - 1].confidence).toBeGreaterThanOrEqual(
          result.suggestions[i].confidence
        );
      }
    });

    it("should provide reasoning for each suggestion", async () => {
      const result = await suggestDocumentsForRequest(
        mockRequestId,
        mockCaseId,
        mockUserId
      );

      result.suggestions.forEach((suggestion) => {
        expect(suggestion.reasoning).toBeDefined();
        expect(suggestion.reasoning.length).toBeGreaterThan(0);
      });
    });

    it("should not suggest already-mapped documents", async () => {
      // Document already mapped to this request should not appear in suggestions
      const result = await suggestDocumentsForRequest(
        mockRequestId,
        mockCaseId,
        mockUserId
      );

      // Get existing mappings
      const existingMappings = await getMappingsForRequest(mockRequestId, mockUserId);
      const mappedDocIds = existingMappings.map((m) => m.documentId);

      // None of the suggestions should be already mapped
      result.suggestions.forEach((suggestion) => {
        expect(mappedDocIds).not.toContain(suggestion.document.id);
      });
    });
  });

  describe("Confidence Calculation", () => {
    it("should calculate high confidence for exact category match", async () => {
      // Request with categoryHint "Financial" matching a bank statement
      const result = await suggestDocumentsForRequest(
        mockRequestId,
        mockCaseId,
        mockUserId
      );

      const financialDocs = result.suggestions.filter(
        (s) => s.document.category === "Financial"
      );

      financialDocs.forEach((doc) => {
        expect(doc.matchFactors.categoryMatch).toBe(true);
        // Category match alone should give at least 30 points
        expect(doc.confidence).toBeGreaterThanOrEqual(30);
      });
    });

    it("should boost confidence for keyword matches", async () => {
      const result = await suggestDocumentsForRequest(
        mockRequestId,
        mockCaseId,
        mockUserId
      );

      const keywordMatches = result.suggestions.filter(
        (s) => s.matchFactors.keywordMatch
      );

      keywordMatches.forEach((doc) => {
        // Keyword match should add significant confidence
        expect(doc.confidence).toBeGreaterThan(50);
      });
    });

    it("should use semantic similarity score", async () => {
      const result = await suggestDocumentsForRequest(
        mockRequestId,
        mockCaseId,
        mockUserId
      );

      result.suggestions.forEach((suggestion) => {
        // Semantic score should contribute to overall confidence
        const expectedMinConfidence = Math.round(
          suggestion.matchFactors.semanticScore * 40
        );
        expect(suggestion.confidence).toBeGreaterThanOrEqual(expectedMinConfidence);
      });
    });
  });
});

describe("Document Mapping CRUD", () => {
  const mockUserId = "user_test123";
  const mockDocumentId = "doc_test123";
  const mockRequestId = "request_test456";

  describe("createDocumentMapping", () => {
    it("should create a manual mapping", async () => {
      const mapping = await createDocumentMapping(
        mockDocumentId,
        mockRequestId,
        mockUserId,
        "manual_addition"
      );

      expect(mapping.id).toBeDefined();
      expect(mapping.documentId).toBe(mockDocumentId);
      expect(mapping.requestId).toBe(mockRequestId);
      expect(mapping.source).toBe("manual_addition");
      expect(mapping.status).toBe("accepted"); // Manual mappings are auto-accepted
    });

    it("should create an AI suggestion mapping", async () => {
      const mapping = await createDocumentMapping(
        mockDocumentId,
        mockRequestId,
        mockUserId,
        "ai_suggestion",
        85,
        "Document contains bank account information matching the request."
      );

      expect(mapping.source).toBe("ai_suggestion");
      expect(mapping.confidence).toBe(85);
      expect(mapping.reasoning).toBeDefined();
      expect(mapping.status).toBe("suggested"); // AI suggestions need review
    });

    it("should prevent duplicate mappings", async () => {
      await createDocumentMapping(
        mockDocumentId,
        mockRequestId,
        mockUserId,
        "manual_addition"
      );

      await expect(
        createDocumentMapping(
          mockDocumentId,
          mockRequestId,
          mockUserId,
          "manual_addition"
        )
      ).rejects.toThrow(/already mapped|duplicate/i);
    });
  });

  describe("getMappingsForRequest", () => {
    it("should return all mappings for a request", async () => {
      const mappings = await getMappingsForRequest(mockRequestId, mockUserId);

      expect(Array.isArray(mappings)).toBe(true);
      mappings.forEach((mapping) => {
        expect(mapping.requestId).toBe(mockRequestId);
      });
    });

    it("should include document details in mappings", async () => {
      const mappings = await getMappingsForRequest(mockRequestId, mockUserId);

      // Mappings should have document info attached
      mappings.forEach((mapping) => {
        expect(mapping.documentId).toBeDefined();
      });
    });
  });

  describe("getMappingsForDocument", () => {
    it("should return all requests a document is mapped to", async () => {
      const mappings = await getMappingsForDocument(mockDocumentId, mockUserId);

      expect(Array.isArray(mappings)).toBe(true);
      mappings.forEach((mapping) => {
        expect(mapping.documentId).toBe(mockDocumentId);
      });
    });
  });

  describe("updateMappingStatus", () => {
    it("should accept a suggested mapping", async () => {
      const created = await createDocumentMapping(
        mockDocumentId,
        mockRequestId,
        mockUserId,
        "ai_suggestion",
        75,
        "Test reasoning"
      );

      const updated = await updateMappingStatus(created.id, "accepted", mockUserId);

      expect(updated.status).toBe("accepted");
      expect(updated.reviewedAt).toBeDefined();
    });

    it("should reject a suggested mapping", async () => {
      const created = await createDocumentMapping(
        mockDocumentId,
        mockRequestId,
        mockUserId,
        "ai_suggestion",
        75,
        "Test reasoning"
      );

      const updated = await updateMappingStatus(created.id, "rejected", mockUserId);

      expect(updated.status).toBe("rejected");
      expect(updated.reviewedAt).toBeDefined();
    });

    it("should track who reviewed the mapping", async () => {
      const created = await createDocumentMapping(
        mockDocumentId,
        mockRequestId,
        mockUserId,
        "ai_suggestion",
        75,
        "Test reasoning"
      );

      const updated = await updateMappingStatus(created.id, "accepted", mockUserId);

      expect(updated.reviewedBy).toBe(mockUserId);
    });
  });

  describe("deleteMapping", () => {
    it("should delete a mapping", async () => {
      const created = await createDocumentMapping(
        mockDocumentId,
        mockRequestId,
        mockUserId,
        "manual_addition"
      );

      const deleted = await deleteMapping(created.id, mockUserId);

      expect(deleted).toBe(true);

      const mappings = await getMappingsForRequest(mockRequestId, mockUserId);
      expect(mappings.find((m) => m.id === created.id)).toBeUndefined();
    });
  });
});

describe("Coverage Tracking", () => {
  const mockUserId = "user_test123";
  const mockRequestId = "request_test456";

  describe("calculateCoveragePercentage", () => {
    it("should return 0% for request with no mappings", async () => {
      const coverage = await calculateCoveragePercentage(mockRequestId, mockUserId);

      expect(coverage).toBe(0);
    });

    it("should return 100% for request with accepted mappings", async () => {
      // Create and accept mappings for the request
      const coverage = await calculateCoveragePercentage(mockRequestId, mockUserId);

      // If there are accepted mappings, coverage should be > 0
      expect(coverage).toBeGreaterThanOrEqual(0);
      expect(coverage).toBeLessThanOrEqual(100);
    });

    it("should only count accepted mappings", async () => {
      // Create suggested (not accepted) mapping
      await createDocumentMapping(
        "doc_test",
        mockRequestId,
        mockUserId,
        "ai_suggestion",
        80,
        "Suggestion"
      );

      const coverage = await calculateCoveragePercentage(mockRequestId, mockUserId);

      // Suggested mappings should not count toward coverage
      expect(coverage).toBe(0);
    });

    it("should update request completionPercentage", async () => {
      // When coverage is calculated, the request's completionPercentage should update
      const coverage = await calculateCoveragePercentage(mockRequestId, mockUserId);

      // Verify the request was updated
      const { getDiscoveryRequest } = await import("@/lib/discovery/requests");
      const request = await getDiscoveryRequest(mockRequestId, mockUserId);

      expect(request?.completionPercentage).toBe(coverage);
    });
  });

  describe("Request Status Updates", () => {
    it("should mark request as complete when all mappings accepted", async () => {
      // Scenario: Request has all needed documents mapped and accepted

      const coverage = await calculateCoveragePercentage(mockRequestId, mockUserId);

      if (coverage === 100) {
        const { getDiscoveryRequest } = await import("@/lib/discovery/requests");
        const request = await getDiscoveryRequest(mockRequestId, mockUserId);

        expect(request?.status).toBe("complete");
      }
    });

    it("should mark request as partial when some mappings exist", async () => {
      // Create at least one accepted mapping
      await createDocumentMapping(
        "doc_test",
        mockRequestId,
        mockUserId,
        "manual_addition"
      );

      const coverage = await calculateCoveragePercentage(mockRequestId, mockUserId);

      if (coverage > 0 && coverage < 100) {
        const { getDiscoveryRequest } = await import("@/lib/discovery/requests");
        const request = await getDiscoveryRequest(mockRequestId, mockUserId);

        expect(request?.status).toBe("partial");
      }
    });
  });
});

describe("Date Range Parsing", () => {
  describe("parseDateRangeFromText", () => {
    const testCases = [
      {
        text: "from January 2023 to present",
        expected: { start: "2023-01-01", end: null }, // null means "present"
      },
      {
        text: "for the years 2020-2023",
        expected: { start: "2020-01-01", end: "2023-12-31" },
      },
      {
        text: "for the past 12 months",
        expected: { start: "relative:-12months", end: "present" },
      },
      {
        text: "from March 1, 2022 through September 30, 2022",
        expected: { start: "2022-03-01", end: "2022-09-30" },
      },
      {
        text: "during calendar year 2023",
        expected: { start: "2023-01-01", end: "2023-12-31" },
      },
    ];

    it.each(testCases)(
      "should parse '$text'",
      async ({ text, expected }) => {
        const { parseDateRangeFromText } = await import(
          "@/lib/discovery/date-parser"
        );

        const result = parseDateRangeFromText(text);

        if (expected.start.startsWith("relative:")) {
          expect(result.isRelative).toBe(true);
        } else {
          expect(result.startDate).toBe(expected.start);
        }

        if (expected.end === null || expected.end === "present") {
          expect(result.endDate).toBeNull();
          expect(result.isOpenEnded).toBe(true);
        } else {
          expect(result.endDate).toBe(expected.end);
        }
      }
    );
  });

  describe("matchDocumentToDateRange", () => {
    it("should match document within date range", async () => {
      const { matchDocumentToDateRange } = await import(
        "@/lib/discovery/date-parser"
      );

      const document = {
        metadata: {
          startDate: "2023-03-01",
          endDate: "2023-03-31",
        },
      };

      const dateRange = {
        startDate: "2023-01-01",
        endDate: "2023-12-31",
      };

      const result = matchDocumentToDateRange(document, dateRange);

      expect(result.matches).toBe(true);
      expect(result.overlapPercentage).toBe(100);
    });

    it("should return partial match for overlapping ranges", async () => {
      const { matchDocumentToDateRange } = await import(
        "@/lib/discovery/date-parser"
      );

      const document = {
        metadata: {
          startDate: "2022-11-01",
          endDate: "2023-02-28",
        },
      };

      const dateRange = {
        startDate: "2023-01-01",
        endDate: "2023-12-31",
      };

      const result = matchDocumentToDateRange(document, dateRange);

      expect(result.matches).toBe(true);
      expect(result.overlapPercentage).toBeLessThan(100);
      expect(result.overlapPercentage).toBeGreaterThan(0);
    });

    it("should not match document outside date range", async () => {
      const { matchDocumentToDateRange } = await import(
        "@/lib/discovery/date-parser"
      );

      const document = {
        metadata: {
          startDate: "2021-01-01",
          endDate: "2021-12-31",
        },
      };

      const dateRange = {
        startDate: "2023-01-01",
        endDate: "2023-12-31",
      };

      const result = matchDocumentToDateRange(document, dateRange);

      expect(result.matches).toBe(false);
      expect(result.overlapPercentage).toBe(0);
    });
  });
});

describe("Semantic Matching with Embeddings", () => {
  describe("semanticMatchDocuments", () => {
    it("should use embeddings for semantic similarity", async () => {
      const { semanticMatchDocuments } = await import(
        "@/lib/discovery/semantic-matching"
      );

      const requestText = "All documents relating to monthly income and wages";
      const caseId = "case_test";
      const userId = "user_test";

      const results = await semanticMatchDocuments(requestText, caseId, userId);

      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(result.similarity).toBeGreaterThanOrEqual(0);
        expect(result.similarity).toBeLessThanOrEqual(1);
      });
    });

    it("should return documents sorted by similarity", async () => {
      const { semanticMatchDocuments } = await import(
        "@/lib/discovery/semantic-matching"
      );

      const results = await semanticMatchDocuments(
        "bank account statements",
        "case_test",
        "user_test"
      );

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(
          results[i].similarity
        );
      }
    });

    it("should filter by minimum similarity threshold", async () => {
      const { semanticMatchDocuments } = await import(
        "@/lib/discovery/semantic-matching"
      );

      const results = await semanticMatchDocuments(
        "bank account statements",
        "case_test",
        "user_test",
        { minSimilarity: 0.5 }
      );

      results.forEach((result) => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.5);
      });
    });
  });
});
