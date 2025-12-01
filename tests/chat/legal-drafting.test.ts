/**
 * TDD Tests for Legal Drafting
 * Phase 11: Advanced Legal Assistant
 *
 * Tests for generating legal documents (discovery requests, narratives, summaries)
 *
 * Note: Tests that require OpenAI API calls are marked with .skipIf
 * to allow running in CI without API keys
 */

import { describe, test, expect, vi } from "vitest";

// Check if we have OpenAI API key for integration tests
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
import {
  generateDraft,
  getDraftingSystemPrompt,
  DraftType,
  DraftOptions,
  DraftResult,
} from "@/lib/ai/legal-drafting";

// Mock case context for testing
const mockCaseContext = {
  caseName: "Smith v. Smith",
  caseType: "Divorce",
  documents: [
    { id: "doc1", fileName: "2023-tax-return.pdf", category: "Financial", subtype: "Tax Return" },
    { id: "doc2", fileName: "bank-statement-jan.pdf", category: "Financial", subtype: "Bank Statement" },
    { id: "doc3", fileName: "pay-stub-march.pdf", category: "Financial", subtype: "Pay Stub" },
  ],
  parties: ["John Smith", "Jane Smith"],
};

describe("Legal Drafting", () => {
  describe("Discovery Request Generation", () => {
    test.skipIf(!hasOpenAIKey)("generates discovery request with proper format", async () => {
      const result = await generateDraft("discovery_request", {
        topic: "bank statements",
        caseContext: mockCaseContext,
      });

      expect(result.content).toContain("REQUEST FOR PRODUCTION");
      expect(result.type).toBe("discovery_request");
    });

    test.skipIf(!hasOpenAIKey)("includes numbered requests", async () => {
      const result = await generateDraft("discovery_request", {
        topic: "financial records",
        caseContext: mockCaseContext,
      });

      // Should have numbered items
      expect(result.content).toMatch(/1\./);
      expect(result.content).toMatch(/2\./);
    });

    test.skipIf(!hasOpenAIKey)("references relevant case documents", async () => {
      const result = await generateDraft("discovery_request", {
        topic: "tax returns",
        caseContext: mockCaseContext,
      });

      expect(result.documentReferences).toBeDefined();
      expect(result.documentReferences?.length).toBeGreaterThan(0);
    });

    test.skipIf(!hasOpenAIKey)("includes definitions section", async () => {
      const result = await generateDraft("discovery_request", {
        topic: "employment records",
        caseContext: mockCaseContext,
      });

      expect(result.content).toMatch(/definition/i);
    });
  });

  describe("Interrogatories Generation", () => {
    test.skipIf(!hasOpenAIKey)("generates interrogatories with proper format", async () => {
      const result = await generateDraft("interrogatories", {
        topic: "income sources",
        caseContext: mockCaseContext,
      });

      expect(result.content).toContain("INTERROGATOR");
      expect(result.type).toBe("interrogatories");
    });

    test.skipIf(!hasOpenAIKey)("generates numbered questions", async () => {
      const result = await generateDraft("interrogatories", {
        topic: "assets",
        caseContext: mockCaseContext,
      });

      // Should have interrogatory numbers
      expect(result.content).toMatch(/INTERROGATORY NO\. 1/i);
    });

    test.skipIf(!hasOpenAIKey)("includes instruction to answer under oath", async () => {
      const result = await generateDraft("interrogatories", {
        topic: "employment history",
        caseContext: mockCaseContext,
      });

      expect(result.content).toMatch(/oath|sworn|penalty of perjury/i);
    });
  });

  describe("Timeline Narrative Generation", () => {
    test.skipIf(!hasOpenAIKey)("generates chronological narrative", async () => {
      const result = await generateDraft("timeline_narrative", {
        caseContext: mockCaseContext,
      });

      expect(result.content).toBeTruthy();
      expect(result.type).toBe("timeline_narrative");
    });

    test.skipIf(!hasOpenAIKey)("includes document citations", async () => {
      const result = await generateDraft("timeline_narrative", {
        caseContext: mockCaseContext,
      });

      // Should reference documents in [Document: filename] format
      expect(result.content).toMatch(/\[Document:/);
    });

    test.skipIf(!hasOpenAIKey)("organizes events chronologically", async () => {
      const result = await generateDraft("timeline_narrative", {
        caseContext: {
          ...mockCaseContext,
          documents: [
            { id: "doc1", fileName: "2023-tax-return.pdf", category: "Financial", date: "2023-04-15" },
            { id: "doc2", fileName: "2022-tax-return.pdf", category: "Financial", date: "2022-04-15" },
          ],
        },
      });

      // 2022 should appear before 2023 in chronological order
      const idx2022 = result.content.indexOf("2022");
      const idx2023 = result.content.indexOf("2023");

      if (idx2022 !== -1 && idx2023 !== -1) {
        expect(idx2022).toBeLessThan(idx2023);
      }
    });
  });

  describe("Case Summary Generation", () => {
    test.skipIf(!hasOpenAIKey)("generates case summary", async () => {
      const result = await generateDraft("case_summary", {
        caseContext: mockCaseContext,
      });

      expect(result.content).toBeTruthy();
      expect(result.type).toBe("case_summary");
    });

    test.skipIf(!hasOpenAIKey)("includes document overview", async () => {
      const result = await generateDraft("case_summary", {
        caseContext: mockCaseContext,
      });

      expect(result.content).toMatch(/document/i);
    });

    test.skipIf(!hasOpenAIKey)("mentions parties involved", async () => {
      const result = await generateDraft("case_summary", {
        caseContext: mockCaseContext,
      });

      expect(result.content).toMatch(/Smith/);
    });

    test.skipIf(!hasOpenAIKey)("includes category breakdown", async () => {
      const result = await generateDraft("case_summary", {
        caseContext: mockCaseContext,
      });

      expect(result.content).toMatch(/financial/i);
    });
  });

  describe("Case Notes Export", () => {
    test.skipIf(!hasOpenAIKey)("formats chat as case notes", async () => {
      const result = await generateDraft("case_notes", {
        caseContext: mockCaseContext,
        chatHistory: [
          { role: "user", content: "What is John's income?" },
          { role: "assistant", content: "Based on the documents, John's income is $5,000/month." },
        ],
      });

      expect(result.content).toContain("Case Notes");
      expect(result.type).toBe("case_notes");
    });

    test.skipIf(!hasOpenAIKey)("includes timestamps in notes", async () => {
      const result = await generateDraft("case_notes", {
        caseContext: mockCaseContext,
        chatHistory: [
          { role: "user", content: "Question" },
          { role: "assistant", content: "Answer" },
        ],
      });

      // Should include date reference
      expect(result.content).toMatch(/\d{4}|\d{1,2}\/\d{1,2}/);
    });

    test.skipIf(!hasOpenAIKey)("preserves document references from chat", async () => {
      const result = await generateDraft("case_notes", {
        caseContext: mockCaseContext,
        chatHistory: [
          { role: "assistant", content: "Per [Document: bank-statement.pdf], the balance was $10,000." },
        ],
      });

      expect(result.content).toContain("bank-statement.pdf");
    });
  });

  describe("System Prompts", () => {
    test("discovery request prompt includes legal formatting instructions", () => {
      const prompt = getDraftingSystemPrompt("discovery_request");

      expect(prompt).toContain("REQUEST FOR PRODUCTION");
      expect(prompt).toMatch(/legal|formal/i);
    });

    test("interrogatories prompt includes question format instructions", () => {
      const prompt = getDraftingSystemPrompt("interrogatories");

      expect(prompt).toContain("INTERROGATORY");
    });

    test("timeline narrative prompt includes chronological instructions", () => {
      const prompt = getDraftingSystemPrompt("timeline_narrative");

      expect(prompt).toMatch(/chronolog|timeline|date/i);
    });

    test("case summary prompt includes overview instructions", () => {
      const prompt = getDraftingSystemPrompt("case_summary");

      expect(prompt).toMatch(/summary|overview|synopsis/i);
    });
  });

  describe("Draft Options", () => {
    test.skipIf(!hasOpenAIKey)("respects tone option - formal", async () => {
      const result = await generateDraft("discovery_request", {
        topic: "bank records",
        caseContext: mockCaseContext,
        tone: "formal",
      });

      // Formal tone should not have contractions
      expect(result.content).not.toMatch(/don't|won't|can't/);
    });

    test.skipIf(!hasOpenAIKey)("respects jurisdiction option", async () => {
      const result = await generateDraft("discovery_request", {
        topic: "financial documents",
        caseContext: mockCaseContext,
        jurisdiction: "Texas",
      });

      expect(result.metadata?.jurisdiction).toBe("Texas");
    });

    test.skipIf(!hasOpenAIKey)("includes court name if provided", async () => {
      const result = await generateDraft("discovery_request", {
        topic: "records",
        caseContext: mockCaseContext,
        courtName: "District Court of Travis County",
      });

      expect(result.content).toContain("Travis County");
    });
  });

  describe("Error Handling", () => {
    test.skipIf(!hasOpenAIKey)("handles missing case context gracefully", async () => {
      const result = await generateDraft("case_summary", {
        caseContext: { caseName: "", documents: [], parties: [] },
      });

      expect(result.content).toBeTruthy();
      expect(result.error).toBeUndefined();
    });

    test.skipIf(!hasOpenAIKey)("handles empty topic for discovery request", async () => {
      const result = await generateDraft("discovery_request", {
        topic: "",
        caseContext: mockCaseContext,
      });

      // Should still generate something or return helpful message
      expect(result.content).toBeTruthy();
    });

    test("returns error for invalid draft type", async () => {
      // @ts-expect-error Testing invalid type
      const result = await generateDraft("invalid_type", {
        caseContext: mockCaseContext,
      });

      expect(result.error).toBeDefined();
    });
  });

  describe("Output Format", () => {
    test.skipIf(!hasOpenAIKey)("result includes content", async () => {
      const result = await generateDraft("case_summary", {
        caseContext: mockCaseContext,
      });

      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe("string");
    });

    test("result includes type", async () => {
      const result = await generateDraft("discovery_request", {
        topic: "records",
        caseContext: mockCaseContext,
      });

      expect(result.type).toBe("discovery_request");
    });

    test.skipIf(!hasOpenAIKey)("result includes token usage", async () => {
      const result = await generateDraft("case_summary", {
        caseContext: mockCaseContext,
      });

      expect(result.tokensUsed).toBeDefined();
      expect(result.tokensUsed).toBeGreaterThan(0);
    });

    test.skipIf(!hasOpenAIKey)("result can include document references", async () => {
      const result = await generateDraft("timeline_narrative", {
        caseContext: mockCaseContext,
      });

      expect(result.documentReferences).toBeDefined();
      expect(Array.isArray(result.documentReferences)).toBe(true);
    });
  });
});
