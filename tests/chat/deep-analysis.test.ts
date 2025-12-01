/**
 * TDD Tests for Deep Analysis
 * Phase 11: Advanced Legal Assistant
 *
 * Tests for multi-document analysis, discrepancy detection, and verification
 *
 * Note: Tests that require OpenAI API calls are marked with .skipIf
 * to allow running in CI without API keys
 */

import { describe, test, expect } from "vitest";

// Check if we have OpenAI API key for integration tests
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
import {
  analyzeDocuments,
  AnalysisType,
  AnalysisOptions,
  AnalysisResult,
  Discrepancy,
  AssetRecord,
  IncomeSource,
} from "@/lib/ai/deep-analysis";

// Mock documents for testing
const mockFinancialDocs = [
  {
    id: "doc1",
    fileName: "2023-tax-return.pdf",
    category: "Financial",
    subtype: "Tax Return",
    content: "Gross income: $120,000. Filing status: Married Filing Jointly.",
    metadata: { year: 2023, income: 120000 },
  },
  {
    id: "doc2",
    fileName: "2023-w2.pdf",
    category: "Financial",
    subtype: "W-2",
    content: "Wages: $115,000. Employer: Acme Corp.",
    metadata: { year: 2023, wages: 115000 },
  },
  {
    id: "doc3",
    fileName: "bank-statement-dec-2023.pdf",
    category: "Financial",
    subtype: "Bank Statement",
    content: "Deposits: $10,500. Balance: $45,000.",
    metadata: { month: "December", year: 2023, deposits: 10500 },
  },
];

const mockCaseId = "case-123";

describe("Deep Analysis", () => {
  describe("Document Comparison", () => {
    test.skipIf(!hasOpenAIKey)("compares two documents and finds similarities", async () => {
      const result = await analyzeDocuments("comparison", {
        caseId: mockCaseId,
        documentIds: ["doc1", "doc2"],
        documents: mockFinancialDocs.slice(0, 2),
      });

      expect(result.type).toBe("comparison");
      expect(result.similarities).toBeDefined();
      expect(Array.isArray(result.similarities)).toBe(true);
    });

    test.skipIf(!hasOpenAIKey)("compares two documents and finds differences", async () => {
      const result = await analyzeDocuments("comparison", {
        caseId: mockCaseId,
        documentIds: ["doc1", "doc2"],
        documents: mockFinancialDocs.slice(0, 2),
      });

      expect(result.differences).toBeDefined();
      expect(Array.isArray(result.differences)).toBe(true);
    });

    test.skipIf(!hasOpenAIKey)("comparison includes document references", async () => {
      const result = await analyzeDocuments("comparison", {
        caseId: mockCaseId,
        documentIds: ["doc1", "doc2"],
        documents: mockFinancialDocs.slice(0, 2),
      });

      expect(result.documentsAnalyzed).toContain("doc1");
      expect(result.documentsAnalyzed).toContain("doc2");
    });

    test.skipIf(!hasOpenAIKey)("handles comparison of more than two documents", async () => {
      const result = await analyzeDocuments("comparison", {
        caseId: mockCaseId,
        documentIds: ["doc1", "doc2", "doc3"],
        documents: mockFinancialDocs,
      });

      expect(result.documentsAnalyzed).toHaveLength(3);
    });
  });

  describe("Discrepancy Detection", () => {
    test.skipIf(!hasOpenAIKey)("detects income discrepancies between documents", async () => {
      const result = await analyzeDocuments("discrepancy", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
        focusArea: "income",
      });

      expect(result.type).toBe("discrepancy");
      expect(result.discrepancies).toBeDefined();
    });

    test.skipIf(!hasOpenAIKey)("flags significant discrepancies", async () => {
      const docsWithDiscrepancy = [
        { ...mockFinancialDocs[0], metadata: { income: 120000 } },
        { ...mockFinancialDocs[1], metadata: { income: 80000 } }, // $40k difference
      ];

      const result = await analyzeDocuments("discrepancy", {
        caseId: mockCaseId,
        documents: docsWithDiscrepancy,
      });

      const significantDiscrepancies = result.discrepancies?.filter(
        (d: Discrepancy) => d.severity === "high"
      );
      expect(significantDiscrepancies?.length).toBeGreaterThan(0);
    });

    test.skipIf(!hasOpenAIKey)("categorizes discrepancy severity", async () => {
      const result = await analyzeDocuments("discrepancy", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
      });

      result.discrepancies?.forEach((d: Discrepancy) => {
        expect(["low", "medium", "high"]).toContain(d.severity);
      });
    });

    test.skipIf(!hasOpenAIKey)("provides explanation for each discrepancy", async () => {
      const result = await analyzeDocuments("discrepancy", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
      });

      result.discrepancies?.forEach((d: Discrepancy) => {
        expect(d.explanation).toBeDefined();
        expect(d.explanation.length).toBeGreaterThan(0);
      });
    });

    test.skipIf(!hasOpenAIKey)("links discrepancies to source documents", async () => {
      const result = await analyzeDocuments("discrepancy", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
      });

      result.discrepancies?.forEach((d: Discrepancy) => {
        expect(d.sourceDocuments).toBeDefined();
        expect(d.sourceDocuments.length).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("Asset Tracking", () => {
    test.skipIf(!hasOpenAIKey)("tracks assets across documents", async () => {
      const docsWithAssets = [
        {
          id: "doc1",
          fileName: "deed.pdf",
          category: "Property",
          content: "Property at 123 Main St. Value: $450,000.",
          metadata: { asset: "house", value: 450000 },
        },
        {
          id: "doc2",
          fileName: "car-title.pdf",
          category: "Property",
          content: "2021 Toyota Camry. VIN: 123ABC.",
          metadata: { asset: "vehicle", value: 25000 },
        },
        {
          id: "doc3",
          fileName: "bank-statement.pdf",
          category: "Financial",
          content: "Account balance: $50,000.",
          metadata: { asset: "bank_account", value: 50000 },
        },
      ];

      const result = await analyzeDocuments("asset_tracking", {
        caseId: mockCaseId,
        documents: docsWithAssets,
      });

      expect(result.type).toBe("asset_tracking");
      expect(result.assets).toBeDefined();
      expect(result.assets?.length).toBeGreaterThan(0);
    });

    test.skipIf(!hasOpenAIKey)("calculates total asset value", async () => {
      const result = await analyzeDocuments("asset_tracking", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
      });

      expect(result.totalValue).toBeDefined();
      expect(typeof result.totalValue).toBe("number");
    });

    test.skipIf(!hasOpenAIKey)("categorizes assets by type", async () => {
      const result = await analyzeDocuments("asset_tracking", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
      });

      expect(result.assetsByCategory).toBeDefined();
    });

    test.skipIf(!hasOpenAIKey)("identifies asset ownership", async () => {
      const result = await analyzeDocuments("asset_tracking", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
      });

      result.assets?.forEach((asset: AssetRecord) => {
        expect(asset.ownership).toBeDefined();
        expect(["joint", "husband", "wife", "unknown"]).toContain(asset.ownership);
      });
    });

    test.skipIf(!hasOpenAIKey)("tracks asset value changes over time", async () => {
      const docsOverTime = [
        {
          id: "doc1",
          fileName: "appraisal-2022.pdf",
          metadata: { asset: "house", value: 400000, date: "2022-01-01" },
        },
        {
          id: "doc2",
          fileName: "appraisal-2023.pdf",
          metadata: { asset: "house", value: 450000, date: "2023-01-01" },
        },
      ];

      const result = await analyzeDocuments("asset_tracking", {
        caseId: mockCaseId,
        documents: docsOverTime,
      });

      expect(result.valueChanges).toBeDefined();
    });
  });

  describe("Income Verification", () => {
    test.skipIf(!hasOpenAIKey)("verifies income from multiple sources", async () => {
      const result = await analyzeDocuments("income_verification", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
      });

      expect(result.type).toBe("income_verification");
      expect(result.incomeSources).toBeDefined();
    });

    test.skipIf(!hasOpenAIKey)("calculates total verified income", async () => {
      const result = await analyzeDocuments("income_verification", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
      });

      expect(result.totalIncome).toBeDefined();
      expect(typeof result.totalIncome).toBe("number");
    });

    test.skipIf(!hasOpenAIKey)("identifies income source types", async () => {
      const result = await analyzeDocuments("income_verification", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
      });

      result.incomeSources?.forEach((source: IncomeSource) => {
        expect(source.type).toBeDefined();
        expect(["employment", "self-employment", "investment", "rental", "other"]).toContain(
          source.type
        );
      });
    });

    test.skipIf(!hasOpenAIKey)("flags unverified income claims", async () => {
      const result = await analyzeDocuments("income_verification", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
      });

      expect(result.unverifiedClaims).toBeDefined();
    });

    test.skipIf(!hasOpenAIKey)("cross-references tax returns with pay stubs", async () => {
      const result = await analyzeDocuments("income_verification", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
      });

      expect(result.crossReferences).toBeDefined();
    });

    test.skipIf(!hasOpenAIKey)("provides confidence score for income figures", async () => {
      const result = await analyzeDocuments("income_verification", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
      });

      expect(result.confidenceScore).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });
  });

  describe("Analysis Output Format", () => {
    test.skipIf(!hasOpenAIKey)("includes summary in result", async () => {
      const result = await analyzeDocuments("comparison", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
      });

      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe("string");
    });

    test.skipIf(!hasOpenAIKey)("includes recommendations", async () => {
      const result = await analyzeDocuments("discrepancy", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
      });

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test.skipIf(!hasOpenAIKey)("includes token usage", async () => {
      const result = await analyzeDocuments("income_verification", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
      });

      expect(result.tokensUsed).toBeDefined();
    });

    test.skipIf(!hasOpenAIKey)("formats output as markdown table when appropriate", async () => {
      const result = await analyzeDocuments("asset_tracking", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
        outputFormat: "table",
      });

      expect(result.formattedOutput).toBeDefined();
      expect(result.formattedOutput).toContain("|");
    });
  });

  describe("Error Handling", () => {
    test("handles empty document list", async () => {
      const result = await analyzeDocuments("comparison", {
        caseId: mockCaseId,
        documents: [],
      });

      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/no documents/i);
    });

    test("handles single document for comparison", async () => {
      const result = await analyzeDocuments("comparison", {
        caseId: mockCaseId,
        documents: [mockFinancialDocs[0]],
      });

      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/at least two/i);
    });

    test("handles invalid analysis type", async () => {
      // @ts-expect-error Testing invalid type
      const result = await analyzeDocuments("invalid_type", {
        caseId: mockCaseId,
        documents: mockFinancialDocs,
      });

      expect(result.error).toBeDefined();
    });

    test("handles documents without content gracefully", async () => {
      const docsWithoutContent = [
        { id: "doc1", fileName: "file.pdf", category: "Financial" },
        { id: "doc2", fileName: "file2.pdf", category: "Financial" },
      ];

      const result = await analyzeDocuments("comparison", {
        caseId: mockCaseId,
        documents: docsWithoutContent,
      });

      // Should not throw, may return limited analysis
      expect(result).toBeDefined();
    });
  });
});
