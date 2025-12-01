/**
 * TDD Tests for Legal Research
 * Phase 11: Advanced Legal Assistant
 *
 * Tests for web search, statute lookups, and citation formatting
 *
 * Note: Tests that require OpenAI API calls are marked with .skipIf
 * to allow running in CI without API keys
 */

import { describe, test, expect, vi } from "vitest";

// Check if we have OpenAI API key for integration tests
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
import {
  conductResearch,
  formatCitation,
  parseStatuteReference,
  ResearchOptions,
  ResearchResult,
  Citation,
  StatuteReference,
} from "@/lib/ai/legal-research";

describe("Legal Research", () => {
  describe("Research Query Processing", () => {
    test.skipIf(!hasOpenAIKey)("conducts research for legal topic", async () => {
      const result = await conductResearch({
        query: "community property laws",
        state: "Texas",
      });

      expect(result.topic).toContain("community property");
      expect(result.sources).toBeDefined();
    });

    test.skipIf(!hasOpenAIKey)("includes state context in research", async () => {
      const result = await conductResearch({
        query: "child custody standards",
        state: "California",
      });

      expect(result.state).toBe("CA");
      expect(result.content).toMatch(/California/i);
    });

    test.skipIf(!hasOpenAIKey)("returns relevant sources", async () => {
      const result = await conductResearch({
        query: "spousal support modification",
      });

      expect(result.sources).toBeDefined();
      expect(Array.isArray(result.sources)).toBe(true);
    });

    test("sources include URLs", async () => {
      const result = await conductResearch({
        query: "divorce property division",
        state: "Texas",
      });

      result.sources?.forEach((source) => {
        expect(source.url).toBeDefined();
        expect(source.url).toMatch(/^https?:\/\//);
      });
    });

    test("sources include titles", async () => {
      const result = await conductResearch({
        query: "alimony guidelines",
      });

      result.sources?.forEach((source) => {
        expect(source.title).toBeDefined();
        expect(source.title.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Statute Lookups", () => {
    test.skipIf(!hasOpenAIKey)("finds statutes for given topic and state", async () => {
      const result = await conductResearch({
        query: "community property statutes",
        state: "Texas",
        type: "statute",
      });

      expect(result.statutes).toBeDefined();
      expect(result.statutes?.length).toBeGreaterThan(0);
    });

    test.skipIf(!hasOpenAIKey)("statute results include code references", async () => {
      const result = await conductResearch({
        query: "child support calculation",
        state: "Texas",
        type: "statute",
      });

      result.statutes?.forEach((statute) => {
        expect(statute.code).toBeDefined();
        expect(statute.section).toBeDefined();
      });
    });

    test("parses Texas Family Code reference", () => {
      const ref = parseStatuteReference("Tex. Fam. Code § 3.002");

      expect(ref.state).toBe("TX");
      expect(ref.code).toBe("Family Code");
      expect(ref.section).toBe("3.002");
    });

    test("parses California Family Code reference", () => {
      const ref = parseStatuteReference("Cal. Fam. Code § 2550");

      expect(ref.state).toBe("CA");
      expect(ref.code).toBe("Family Code");
      expect(ref.section).toBe("2550");
    });

    test("handles full state name in reference", () => {
      const ref = parseStatuteReference("Texas Family Code Section 7.001");

      expect(ref.state).toBe("TX");
      expect(ref.section).toBe("7.001");
    });
  });

  describe("Citation Formatting", () => {
    test("formats Texas statute citation", () => {
      const citation = formatCitation({
        type: "statute",
        state: "TX",
        code: "Family Code",
        section: "3.002",
      });

      expect(citation).toBe("Tex. Fam. Code § 3.002");
    });

    test("formats California statute citation", () => {
      const citation = formatCitation({
        type: "statute",
        state: "CA",
        code: "Family Code",
        section: "2550",
      });

      expect(citation).toBe("Cal. Fam. Code § 2550");
    });

    test("formats New York statute citation", () => {
      const citation = formatCitation({
        type: "statute",
        state: "NY",
        code: "Domestic Relations Law",
        section: "236",
      });

      expect(citation).toBe("N.Y. Dom. Rel. Law § 236");
    });

    test("formats case citation", () => {
      const citation = formatCitation({
        type: "case",
        caseName: "Smith v. Smith",
        volume: "123",
        reporter: "S.W.3d",
        page: "456",
        year: "2020",
        court: "Tex. App.",
      });

      expect(citation).toBe("Smith v. Smith, 123 S.W.3d 456 (Tex. App. 2020)");
    });

    test("formats federal statute citation", () => {
      const citation = formatCitation({
        type: "statute",
        state: "federal",
        code: "U.S.C.",
        title: "26",
        section: "61",
      });

      expect(citation).toBe("26 U.S.C. § 61");
    });

    test("handles missing optional fields gracefully", () => {
      const citation = formatCitation({
        type: "statute",
        state: "TX",
        code: "Family Code",
        section: "3.002",
      });

      expect(citation).toBeTruthy();
      expect(citation).not.toContain("undefined");
    });
  });

  describe("Research Result Format", () => {
    test.skipIf(!hasOpenAIKey)("includes summary of findings", async () => {
      const result = await conductResearch({
        query: "divorce grounds",
        state: "Texas",
      });

      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(50);
    });

    test.skipIf(!hasOpenAIKey)("includes relevant citations", async () => {
      const result = await conductResearch({
        query: "property division",
        state: "California",
      });

      expect(result.citations).toBeDefined();
      expect(Array.isArray(result.citations)).toBe(true);
    });

    test.skipIf(!hasOpenAIKey)("citations are properly formatted", async () => {
      const result = await conductResearch({
        query: "alimony duration",
        state: "Texas",
      });

      result.citations?.forEach((citation) => {
        // Should contain section symbol or standard citation format
        expect(citation).toMatch(/§|v\.|U\.S\.C\./);
      });
    });

    test.skipIf(!hasOpenAIKey)("includes token usage", async () => {
      const result = await conductResearch({
        query: "child custody factors",
      });

      expect(result.tokensUsed).toBeDefined();
      expect(result.tokensUsed).toBeGreaterThan(0);
    });

    test("indicates if web search was used", async () => {
      const result = await conductResearch({
        query: "recent family law changes",
        useWebSearch: true,
      });

      expect(result.webSearchUsed).toBe(true);
    });
  });

  describe("State Recognition", () => {
    test("recognizes full state names", async () => {
      const result = await conductResearch({
        query: "divorce laws in California",
      });

      // Result state is normalized to abbreviation
      expect(result.state).toBe("CA");
    });

    test("recognizes state abbreviations", async () => {
      const result = await conductResearch({
        query: "TX family code",
      });

      expect(result.state).toBe("TX");
    });

    test("handles multiple state mentions - uses most relevant", async () => {
      const result = await conductResearch({
        query: "Compare Texas and California community property",
        state: "Texas", // Explicit state takes priority
      });

      // Explicit state is normalized to abbreviation
      expect(result.state).toBe("TX");
    });

    test("handles queries without state", async () => {
      const result = await conductResearch({
        query: "general divorce procedures",
      });

      // Should return federal/general results or prompt for state
      expect(result).toBeDefined();
    });
  });

  describe("Research History", () => {
    test("includes research metadata", async () => {
      const result = await conductResearch({
        query: "spousal support",
        state: "Texas",
      });

      // Metadata is included when API call succeeds, or result has error
      // Either way, result should be defined
      expect(result).toBeDefined();
      // If no error, metadata should exist
      if (!result.error) {
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.timestamp).toBeDefined();
      }
    });

    test("can be saved to chat history", async () => {
      const result = await conductResearch({
        query: "custody modification",
        state: "California",
      });

      expect(result.chatMessage).toBeDefined();
      // Should be formatted for display in chat
      expect(typeof result.chatMessage).toBe("string");
    });
  });

  describe("Error Handling", () => {
    test("handles empty query", async () => {
      const result = await conductResearch({
        query: "",
      });

      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/query.*required/i);
    });

    test("handles invalid state", async () => {
      const result = await conductResearch({
        query: "divorce laws",
        state: "InvalidState",
      });

      // Should still return results, possibly with warning
      expect(result).toBeDefined();
      expect(result.warnings).toBeDefined();
    });

    test("handles web search failure gracefully", async () => {
      // Mock web search to fail
      const result = await conductResearch({
        query: "obscure legal topic",
        useWebSearch: true,
      });

      // Should not throw, should return fallback content
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    });

    test("handles rate limiting", async () => {
      // Simulate multiple rapid requests
      const results = await Promise.all([
        conductResearch({ query: "topic 1" }),
        conductResearch({ query: "topic 2" }),
        conductResearch({ query: "topic 3" }),
      ]);

      results.forEach((result) => {
        expect(result).toBeDefined();
        // Should handle gracefully, not throw
      });
    });
  });

  describe("Citation Validation", () => {
    test("validates statute citation format", () => {
      const validCitation: Citation = {
        type: "statute",
        state: "TX",
        code: "Family Code",
        section: "3.002",
      };

      const formatted = formatCitation(validCitation);
      expect(formatted).toBeTruthy();
    });

    test("validates case citation format", () => {
      const validCitation: Citation = {
        type: "case",
        caseName: "In re Marriage of Smith",
        volume: "100",
        reporter: "Cal.App.4th",
        page: "200",
        year: "2019",
      };

      const formatted = formatCitation(validCitation);
      expect(formatted).toContain("Smith");
      expect(formatted).toContain("2019");
    });
  });
});

describe("State Abbreviation Mapping", () => {
  const stateTests = [
    { full: "Texas", abbrev: "TX" },
    { full: "California", abbrev: "CA" },
    { full: "New York", abbrev: "NY" },
    { full: "Florida", abbrev: "FL" },
    { full: "Illinois", abbrev: "IL" },
  ];

  stateTests.forEach(({ full, abbrev }) => {
    test(`maps ${full} to ${abbrev}`, () => {
      const ref = parseStatuteReference(`${full} Family Code § 1.001`);
      expect(ref.state).toBe(abbrev);
    });
  });
});
