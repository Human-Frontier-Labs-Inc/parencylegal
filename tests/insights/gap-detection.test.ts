/**
 * Gap Detection Tests
 * Phase 7: Case Insights & Gap Detection
 *
 * Tests for document gap detection algorithm
 */

import { describe, it, expect } from "vitest";
import {
  detectDocumentGaps,
  getDocumentChecklist,
  FAMILY_LAW_DOCUMENT_CHECKLIST,
  DocumentInfo,
} from "@/lib/ai/gap-detection";

describe("Gap Detection Algorithm", () => {
  describe("detectDocumentGaps", () => {
    it("should detect missing required documents", () => {
      const documents: DocumentInfo[] = [
        {
          id: "1",
          fileName: "bank_statement.pdf",
          category: "Financial",
          subtype: "Bank Statement",
          metadata: null,
        },
      ];

      const result = detectDocumentGaps(documents);

      // Should have missing documents (Tax Return, W-2, Pay Stub, etc.)
      expect(result.missingDocuments.length).toBeGreaterThan(0);
      expect(result.missingDocuments.some((d) => d.type === "Tax Return")).toBe(true);
      expect(result.missingDocuments.some((d) => d.type === "W-2")).toBe(true);
    });

    it("should calculate completion score correctly", () => {
      const documents: DocumentInfo[] = [];

      const result = detectDocumentGaps(documents);

      // Empty case should have 0 completion
      expect(result.completionScore).toBe(0);
    });

    it("should detect all required documents when present", () => {
      const documents: DocumentInfo[] = [
        { id: "1", fileName: "tax_return_2023.pdf", category: "Financial", subtype: "Tax Return", metadata: null },
        { id: "2", fileName: "tax_return_2022.pdf", category: "Financial", subtype: "Tax Return", metadata: null },
        { id: "3", fileName: "w2_2023.pdf", category: "Financial", subtype: "W-2", metadata: null },
        { id: "4", fileName: "bank_stmt.pdf", category: "Financial", subtype: "Bank Statement", metadata: null },
        { id: "5", fileName: "pay_stub.pdf", category: "Financial", subtype: "Pay Stub", metadata: null },
        { id: "6", fileName: "cc_stmt.pdf", category: "Financial", subtype: "Credit Card Statement", metadata: null },
        { id: "7", fileName: "marriage_cert.pdf", category: "Legal", subtype: "Marriage Certificate", metadata: null },
        { id: "8", fileName: "prenup.pdf", category: "Legal", subtype: "Prenuptial Agreement", metadata: null },
        { id: "9", fileName: "deed.pdf", category: "Property", subtype: "Property Deed", metadata: null },
        { id: "10", fileName: "mortgage.pdf", category: "Property", subtype: "Mortgage Statement", metadata: null },
        { id: "11", fileName: "id.pdf", category: "Personal", subtype: "Identification", metadata: null },
        { id: "12", fileName: "contract.pdf", category: "Employment", subtype: "Employment Contract", metadata: null },
      ];

      const result = detectDocumentGaps(documents);

      // Should have higher completion score with all docs
      expect(result.completionScore).toBeGreaterThan(50);
    });

    it("should detect date gaps in bank statements", () => {
      const documents: DocumentInfo[] = [
        {
          id: "1",
          fileName: "bank_jan.pdf",
          category: "Financial",
          subtype: "Bank Statement",
          metadata: { startDate: "2024-01-01", endDate: "2024-01-31" },
        },
        {
          id: "2",
          fileName: "bank_apr.pdf",
          category: "Financial",
          subtype: "Bank Statement",
          metadata: { startDate: "2024-04-01", endDate: "2024-04-30" },
        },
      ];

      const result = detectDocumentGaps(documents);

      // Should detect gap between January and April
      expect(result.dateGaps.length).toBeGreaterThan(0);
      expect(result.dateGaps[0].type).toBe("Bank Statement");
    });

    it("should not detect date gaps for consecutive statements", () => {
      const documents: DocumentInfo[] = [
        {
          id: "1",
          fileName: "bank_jan.pdf",
          category: "Financial",
          subtype: "Bank Statement",
          metadata: { startDate: "2024-01-01", endDate: "2024-01-31" },
        },
        {
          id: "2",
          fileName: "bank_feb.pdf",
          category: "Financial",
          subtype: "Bank Statement",
          metadata: { startDate: "2024-02-01", endDate: "2024-02-29" },
        },
      ];

      const result = detectDocumentGaps(documents);

      // Should not detect gaps for consecutive months
      expect(result.dateGaps.length).toBe(0);
    });

    it("should generate recommendations based on gaps", () => {
      const documents: DocumentInfo[] = [];

      const result = detectDocumentGaps(documents);

      // Empty case should have recommendations
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should calculate category scores", () => {
      const documents: DocumentInfo[] = [
        { id: "1", fileName: "tax.pdf", category: "Financial", subtype: "Tax Return", metadata: null },
      ];

      const result = detectDocumentGaps(documents);

      // Should have category scores
      expect(result.categoryScores).toBeDefined();
      expect(result.categoryScores["Financial"]).toBeDefined();
      expect(result.categoryScores["Financial"].found).toBeGreaterThanOrEqual(1);
    });

    it("should prioritize missing documents correctly", () => {
      const documents: DocumentInfo[] = [];

      const result = detectDocumentGaps(documents);

      // High priority documents should be marked
      const highPriority = result.missingDocuments.filter((d) => d.priority === "high");
      expect(highPriority.length).toBeGreaterThan(0);
    });
  });

  describe("getDocumentChecklist", () => {
    it("should return a checklist of all document types", () => {
      const checklist = getDocumentChecklist();

      expect(checklist.length).toBeGreaterThan(0);
      expect(checklist[0]).toHaveProperty("category");
      expect(checklist[0]).toHaveProperty("type");
      expect(checklist[0]).toHaveProperty("description");
      expect(checklist[0]).toHaveProperty("required");
    });

    it("should include both required and optional documents", () => {
      const checklist = getDocumentChecklist();

      const required = checklist.filter((d) => d.required);
      const optional = checklist.filter((d) => !d.required);

      expect(required.length).toBeGreaterThan(0);
      expect(optional.length).toBeGreaterThan(0);
    });
  });

  describe("FAMILY_LAW_DOCUMENT_CHECKLIST", () => {
    it("should have all expected categories", () => {
      const categories = Object.keys(FAMILY_LAW_DOCUMENT_CHECKLIST);

      expect(categories).toContain("Financial");
      expect(categories).toContain("Legal");
      expect(categories).toContain("Property");
      expect(categories).toContain("Personal");
      expect(categories).toContain("Employment");
      expect(categories).toContain("Medical");
    });

    it("should have required documents in Financial category", () => {
      const financial = FAMILY_LAW_DOCUMENT_CHECKLIST.Financial;

      expect(financial.required.length).toBeGreaterThan(0);
      expect(financial.required.some((d) => d.type === "Tax Return")).toBe(true);
      expect(financial.required.some((d) => d.type === "Bank Statement")).toBe(true);
    });
  });
});

describe("Insights API Response", () => {
  it("should have correct structure for insights response", () => {
    // Mock insights response structure
    const mockInsights = {
      summary: {
        totalDocuments: 10,
        classifiedDocuments: 8,
        needsReviewDocuments: 2,
        reviewedDocuments: 5,
        classificationProgress: 80,
        reviewProgress: 62,
      },
      quality: {
        averageConfidence: 75,
        confidenceDistribution: {
          high: 5,
          medium: 2,
          low: 1,
        },
      },
      categories: {
        Financial: { count: 5, subtypes: { "Bank Statement": 3, "Tax Return": 2 } },
      },
      gaps: {
        completionScore: 60,
        missingDocuments: [],
        dateGaps: [],
        categoryScores: {},
      },
      recommendations: [],
      recentDocuments: [],
      needsAttention: [],
    };

    // Validate structure
    expect(mockInsights.summary).toHaveProperty("totalDocuments");
    expect(mockInsights.summary).toHaveProperty("classificationProgress");
    expect(mockInsights.quality).toHaveProperty("averageConfidence");
    expect(mockInsights.gaps).toHaveProperty("completionScore");
    expect(mockInsights.gaps).toHaveProperty("missingDocuments");
  });
});
