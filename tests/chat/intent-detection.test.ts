/**
 * TDD Tests for Intent Detection
 * Phase 11: Advanced Legal Assistant
 *
 * Tests for detecting user intent from natural language messages
 * to route to appropriate handlers (draft, analyze, research, general)
 */

import { describe, test, expect } from "vitest";
import {
  detectIntent,
  IntentType,
  DraftSubtype,
  AnalysisSubtype,
  Intent,
} from "@/lib/ai/intent-detection";

describe("Intent Detection", () => {
  describe("Draft Intent Detection", () => {
    test("detects discovery request draft intent", () => {
      const intent = detectIntent("Draft a discovery request for bank statements");

      expect(intent.type).toBe("draft");
      expect(intent.subtype).toBe("discovery_request");
      expect(intent.topic).toContain("bank");
    });

    test("detects interrogatories draft intent", () => {
      const intent = detectIntent("Generate interrogatories about income sources");

      expect(intent.type).toBe("draft");
      expect(intent.subtype).toBe("interrogatories");
      expect(intent.topic).toContain("income");
    });

    test("detects RFP (request for production) intent", () => {
      const intent = detectIntent("Create a request for production of tax returns");

      expect(intent.type).toBe("draft");
      expect(intent.subtype).toBe("rfp");
      expect(intent.topic).toContain("tax");
    });

    test("detects timeline narrative draft intent", () => {
      const intent = detectIntent("Generate a timeline narrative for this case");

      expect(intent.type).toBe("draft");
      expect(intent.subtype).toBe("timeline_narrative");
    });

    test("detects case summary draft intent", () => {
      const intent = detectIntent("Summarize this case");

      expect(intent.type).toBe("draft");
      expect(intent.subtype).toBe("case_summary");
    });

    test("detects case summary with 'create summary' phrasing", () => {
      const intent = detectIntent("Create a summary of all the documents");

      expect(intent.type).toBe("draft");
      expect(intent.subtype).toBe("case_summary");
    });

    test("detects export chat as notes intent", () => {
      const intent = detectIntent("Export this conversation as case notes");

      expect(intent.type).toBe("draft");
      expect(intent.subtype).toBe("case_notes");
    });
  });

  describe("Analysis Intent Detection", () => {
    test("detects document comparison intent", () => {
      const intent = detectIntent("Compare the 2022 and 2023 tax returns");

      expect(intent.type).toBe("analyze");
      expect(intent.subtype).toBe("comparison");
    });

    test("detects discrepancy detection intent", () => {
      const intent = detectIntent("Find discrepancies in the financial records");

      expect(intent.type).toBe("analyze");
      expect(intent.subtype).toBe("discrepancy");
    });

    test("detects income discrepancy intent", () => {
      const intent = detectIntent("Are there any income inconsistencies?");

      expect(intent.type).toBe("analyze");
      expect(intent.subtype).toBe("discrepancy");
    });

    test("detects asset tracking intent", () => {
      const intent = detectIntent("Track assets across all documents");

      expect(intent.type).toBe("analyze");
      expect(intent.subtype).toBe("asset_tracking");
    });

    test("detects income verification intent", () => {
      const intent = detectIntent("Verify income from all sources");

      expect(intent.type).toBe("analyze");
      expect(intent.subtype).toBe("income_verification");
    });

    test("detects analysis with 'analyze' keyword", () => {
      const intent = detectIntent("Analyze the bank statements for unusual transactions");

      expect(intent.type).toBe("analyze");
    });
  });

  describe("Research Intent Detection", () => {
    test("detects legal research intent with state", () => {
      const intent = detectIntent("Research community property laws in Texas");

      expect(intent.type).toBe("research");
      expect(intent.state).toBe("Texas");
      expect(intent.topic).toContain("community property");
    });

    test("detects statute lookup intent", () => {
      const intent = detectIntent("Find statutes about child custody in California");

      expect(intent.type).toBe("research");
      expect(intent.state).toBe("California");
      expect(intent.topic).toContain("child custody");
    });

    test("detects general legal question", () => {
      const intent = detectIntent("What is the law on asset division?");

      expect(intent.type).toBe("research");
      expect(intent.topic).toContain("asset division");
    });

    test("detects case law lookup", () => {
      const intent = detectIntent("Look up cases about spousal support modification");

      expect(intent.type).toBe("research");
      expect(intent.topic).toContain("spousal support");
    });

    test("extracts state abbreviations", () => {
      const intent = detectIntent("Research divorce laws in TX");

      expect(intent.type).toBe("research");
      expect(intent.state).toBe("TX");
    });
  });

  describe("General Query Detection", () => {
    test("detects general document question", () => {
      const intent = detectIntent("What documents do we have?");

      expect(intent.type).toBe("general");
    });

    test("detects general content question", () => {
      const intent = detectIntent("What is John's monthly income?");

      expect(intent.type).toBe("general");
    });

    test("detects simple summarization as general", () => {
      const intent = detectIntent("Tell me about the bank statements");

      expect(intent.type).toBe("general");
    });

    test("detects document lookup as general", () => {
      const intent = detectIntent("Find mentions of the house");

      expect(intent.type).toBe("general");
    });
  });

  describe("Edge Cases", () => {
    test("handles empty message", () => {
      const intent = detectIntent("");

      expect(intent.type).toBe("general");
    });

    test("handles ambiguous message - defaults to general", () => {
      const intent = detectIntent("Help me with this case");

      expect(intent.type).toBe("general");
    });

    test("is case insensitive", () => {
      const intent = detectIntent("DRAFT A DISCOVERY REQUEST");

      expect(intent.type).toBe("draft");
    });

    test("handles multiple keywords - prioritizes first match", () => {
      // "Draft" should take priority over "research"
      const intent = detectIntent("Draft a research summary");

      expect(intent.type).toBe("draft");
    });

    test("extracts topic from complex sentences", () => {
      const intent = detectIntent(
        "I need you to draft a discovery request for all bank statements and financial records from the past 3 years"
      );

      expect(intent.type).toBe("draft");
      expect(intent.subtype).toBe("discovery_request");
      expect(intent.topic).toBeTruthy();
    });
  });

  describe("Confidence Scoring", () => {
    test("high confidence for explicit draft keyword", () => {
      const intent = detectIntent("Draft a discovery request");

      expect(intent.confidence).toBeGreaterThan(0.8);
    });

    test("medium confidence for implicit intent", () => {
      const intent = detectIntent("I need interrogatories");

      expect(intent.confidence).toBeGreaterThan(0.5);
      expect(intent.confidence).toBeLessThan(0.9);
    });

    test("lower confidence for ambiguous messages", () => {
      const intent = detectIntent("Can you help with documents?");

      expect(intent.confidence).toBeLessThan(0.7);
    });
  });
});

describe("Intent Type Definitions", () => {
  test("IntentType includes all expected types", () => {
    const types: IntentType[] = ["draft", "analyze", "research", "general"];
    expect(types).toHaveLength(4);
  });

  test("DraftSubtype includes all expected subtypes", () => {
    const subtypes: DraftSubtype[] = [
      "discovery_request",
      "interrogatories",
      "rfp",
      "timeline_narrative",
      "case_summary",
      "case_notes",
    ];
    expect(subtypes).toHaveLength(6);
  });

  test("AnalysisSubtype includes all expected subtypes", () => {
    const subtypes: AnalysisSubtype[] = [
      "comparison",
      "discrepancy",
      "asset_tracking",
      "income_verification",
    ];
    expect(subtypes).toHaveLength(4);
  });
});
