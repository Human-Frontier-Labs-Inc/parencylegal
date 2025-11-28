/**
 * Discovery Request API Tests
 * Phase 8: Discovery Request Tracking
 *
 * TDD Tests - Written BEFORE implementation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock types matching our schema
interface DiscoveryRequest {
  id: string;
  caseId: string;
  userId: string;
  type: "RFP" | "Interrogatory";
  number: number;
  text: string;
  categoryHint: string | null;
  status: "incomplete" | "complete" | "partial";
  completionPercentage: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateDiscoveryRequestInput {
  caseId: string;
  type: "RFP" | "Interrogatory";
  number: number;
  text: string;
  categoryHint?: string;
  notes?: string;
}

interface BulkImportResult {
  imported: number;
  failed: number;
  requests: DiscoveryRequest[];
  errors: Array<{ line: number; error: string }>;
}

// Helper functions (to be implemented in lib/discovery/*)
async function createDiscoveryRequest(
  input: CreateDiscoveryRequestInput,
  userId: string
): Promise<DiscoveryRequest> {
  // TODO: Implement in lib/discovery/requests.ts
  throw new Error("Not implemented");
}

async function getDiscoveryRequests(
  caseId: string,
  userId: string
): Promise<DiscoveryRequest[]> {
  throw new Error("Not implemented");
}

async function getDiscoveryRequest(
  requestId: string,
  userId: string
): Promise<DiscoveryRequest | null> {
  throw new Error("Not implemented");
}

async function updateDiscoveryRequest(
  requestId: string,
  updates: Partial<CreateDiscoveryRequestInput>,
  userId: string
): Promise<DiscoveryRequest> {
  throw new Error("Not implemented");
}

async function deleteDiscoveryRequest(
  requestId: string,
  userId: string
): Promise<boolean> {
  throw new Error("Not implemented");
}

async function bulkImportDiscoveryRequests(
  caseId: string,
  text: string,
  userId: string
): Promise<BulkImportResult> {
  throw new Error("Not implemented");
}

// Import the actual implementations
import { parseDiscoveryText as parseDiscoveryTextImpl } from "@/lib/discovery/bulk-import";
import { detectCategoryFromText } from "@/lib/discovery/category-detection";

async function parseDiscoveryText(
  text: string
): Promise<Array<{ type: "RFP" | "Interrogatory"; number: number; text: string }>> {
  // Use the actual implementation
  return parseDiscoveryTextImpl(text);
}

describe("Discovery Request CRUD", () => {
  const mockUserId = "user_test123";
  const mockCaseId = "case_test456";

  describe("createDiscoveryRequest", () => {
    it("should create an RFP with all fields", async () => {
      const input: CreateDiscoveryRequestInput = {
        caseId: mockCaseId,
        type: "RFP",
        number: 1,
        text: "All bank statements from January 2023 to present",
        categoryHint: "Financial",
        notes: "High priority",
      };

      const result = await createDiscoveryRequest(input, mockUserId);

      expect(result.id).toBeDefined();
      expect(result.caseId).toBe(mockCaseId);
      expect(result.userId).toBe(mockUserId);
      expect(result.type).toBe("RFP");
      expect(result.number).toBe(1);
      expect(result.text).toBe(input.text);
      expect(result.categoryHint).toBe("Financial");
      expect(result.status).toBe("incomplete");
      expect(result.completionPercentage).toBe(0);
    });

    it("should create an Interrogatory", async () => {
      const input: CreateDiscoveryRequestInput = {
        caseId: mockCaseId,
        type: "Interrogatory",
        number: 5,
        text: "State the names and addresses of all persons with knowledge of the facts.",
      };

      const result = await createDiscoveryRequest(input, mockUserId);

      expect(result.type).toBe("Interrogatory");
      expect(result.number).toBe(5);
    });

    it("should auto-assign category hint based on keywords", async () => {
      const input: CreateDiscoveryRequestInput = {
        caseId: mockCaseId,
        type: "RFP",
        number: 2,
        text: "All tax returns filed for the years 2020-2023",
      };

      const result = await createDiscoveryRequest(input, mockUserId);

      // Should auto-detect Financial category from "tax returns"
      expect(result.categoryHint).toBe("Financial");
    });

    it("should reject duplicate request numbers within same case and type", async () => {
      const input: CreateDiscoveryRequestInput = {
        caseId: mockCaseId,
        type: "RFP",
        number: 1,
        text: "First request",
      };

      await createDiscoveryRequest(input, mockUserId);

      // Creating another RFP #1 for same case should fail
      await expect(
        createDiscoveryRequest({ ...input, text: "Duplicate request" }, mockUserId)
      ).rejects.toThrow(/duplicate|already exists/i);
    });
  });

  describe("getDiscoveryRequests", () => {
    it("should return all requests for a case", async () => {
      const results = await getDiscoveryRequests(mockCaseId, mockUserId);

      expect(Array.isArray(results)).toBe(true);
    });

    it("should return requests sorted by type and number", async () => {
      const results = await getDiscoveryRequests(mockCaseId, mockUserId);

      // Should be sorted: RFPs first (by number), then Interrogatories (by number)
      for (let i = 1; i < results.length; i++) {
        const prev = results[i - 1];
        const curr = results[i];
        if (prev.type === curr.type) {
          expect(prev.number).toBeLessThanOrEqual(curr.number);
        }
      }
    });

    it("should only return requests for the authenticated user", async () => {
      const results = await getDiscoveryRequests(mockCaseId, mockUserId);

      results.forEach((request) => {
        expect(request.userId).toBe(mockUserId);
      });
    });
  });

  describe("getDiscoveryRequest", () => {
    it("should return a single request by ID", async () => {
      const created = await createDiscoveryRequest(
        {
          caseId: mockCaseId,
          type: "RFP",
          number: 10,
          text: "Test request",
        },
        mockUserId
      );

      const result = await getDiscoveryRequest(created.id, mockUserId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
    });

    it("should return null for non-existent request", async () => {
      const result = await getDiscoveryRequest("non_existent_id", mockUserId);

      expect(result).toBeNull();
    });

    it("should return null for request owned by different user", async () => {
      const created = await createDiscoveryRequest(
        {
          caseId: mockCaseId,
          type: "RFP",
          number: 11,
          text: "Test request",
        },
        mockUserId
      );

      const result = await getDiscoveryRequest(created.id, "different_user");

      expect(result).toBeNull();
    });
  });

  describe("updateDiscoveryRequest", () => {
    it("should update request text", async () => {
      const created = await createDiscoveryRequest(
        {
          caseId: mockCaseId,
          type: "RFP",
          number: 20,
          text: "Original text",
        },
        mockUserId
      );

      const updated = await updateDiscoveryRequest(
        created.id,
        { text: "Updated text" },
        mockUserId
      );

      expect(updated.text).toBe("Updated text");
      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime());
    });

    it("should update status and completion percentage", async () => {
      const created = await createDiscoveryRequest(
        {
          caseId: mockCaseId,
          type: "RFP",
          number: 21,
          text: "Test request",
        },
        mockUserId
      );

      const updated = await updateDiscoveryRequest(
        created.id,
        { status: "partial" as any, completionPercentage: 50 } as any,
        mockUserId
      );

      expect(updated.status).toBe("partial");
      expect(updated.completionPercentage).toBe(50);
    });

    it("should not allow updating to invalid status", async () => {
      const created = await createDiscoveryRequest(
        {
          caseId: mockCaseId,
          type: "RFP",
          number: 22,
          text: "Test request",
        },
        mockUserId
      );

      await expect(
        updateDiscoveryRequest(
          created.id,
          { status: "invalid_status" as any } as any,
          mockUserId
        )
      ).rejects.toThrow();
    });
  });

  describe("deleteDiscoveryRequest", () => {
    it("should delete a request", async () => {
      const created = await createDiscoveryRequest(
        {
          caseId: mockCaseId,
          type: "RFP",
          number: 30,
          text: "To be deleted",
        },
        mockUserId
      );

      const deleted = await deleteDiscoveryRequest(created.id, mockUserId);

      expect(deleted).toBe(true);

      const result = await getDiscoveryRequest(created.id, mockUserId);
      expect(result).toBeNull();
    });

    it("should return false for non-existent request", async () => {
      const deleted = await deleteDiscoveryRequest("non_existent_id", mockUserId);

      expect(deleted).toBe(false);
    });

    it("should cascade delete associated mappings", async () => {
      // This test verifies the cascade delete works
      const created = await createDiscoveryRequest(
        {
          caseId: mockCaseId,
          type: "RFP",
          number: 31,
          text: "Request with mappings",
        },
        mockUserId
      );

      // TODO: Add document mappings to this request
      // Then delete the request and verify mappings are gone

      const deleted = await deleteDiscoveryRequest(created.id, mockUserId);
      expect(deleted).toBe(true);
    });
  });
});

describe("Bulk Import", () => {
  const mockUserId = "user_test123";
  const mockCaseId = "case_test456";

  describe("parseDiscoveryText", () => {
    it("should parse RFP format with colon", async () => {
      const text = `RFP 1: All bank statements from January 2023 to present.
RFP 2: All tax returns for years 2020-2023.
RFP 3: All pay stubs for the past 12 months.`;

      const parsed = await parseDiscoveryText(text);

      expect(parsed.length).toBe(3);
      expect(parsed[0]).toEqual({
        type: "RFP",
        number: 1,
        text: "All bank statements from January 2023 to present.",
      });
      expect(parsed[1].number).toBe(2);
      expect(parsed[2].number).toBe(3);
    });

    it("should parse Interrogatory format", async () => {
      const text = `Interrogatory No. 1: State your full legal name.
Interrogatory No. 2: State your current address.`;

      const parsed = await parseDiscoveryText(text);

      expect(parsed.length).toBe(2);
      expect(parsed[0].type).toBe("Interrogatory");
      expect(parsed[0].number).toBe(1);
    });

    it("should parse mixed RFP and Interrogatory", async () => {
      const text = `RFP 1: All financial documents.
Interrogatory 1: State your income.
RFP 2: All medical records.`;

      const parsed = await parseDiscoveryText(text);

      expect(parsed.length).toBe(3);
      expect(parsed[0].type).toBe("RFP");
      expect(parsed[1].type).toBe("Interrogatory");
      expect(parsed[2].type).toBe("RFP");
    });

    it("should handle multi-line request text", async () => {
      const text = `RFP 1: All documents relating to:
(a) bank accounts
(b) investment accounts
(c) retirement accounts

RFP 2: All tax returns.`;

      const parsed = await parseDiscoveryText(text);

      expect(parsed.length).toBe(2);
      expect(parsed[0].text).toContain("(a) bank accounts");
      expect(parsed[0].text).toContain("(b) investment accounts");
    });

    it("should handle REQUEST FOR PRODUCTION format", async () => {
      const text = `REQUEST FOR PRODUCTION NO. 1: Produce all bank statements.
REQUEST FOR PRODUCTION NO. 2: Produce all tax documents.`;

      const parsed = await parseDiscoveryText(text);

      expect(parsed.length).toBe(2);
      expect(parsed[0].type).toBe("RFP");
    });

    it("should skip empty or invalid lines", async () => {
      const text = `RFP 1: Valid request.

This is not a valid request format.

RFP 2: Another valid request.`;

      const parsed = await parseDiscoveryText(text);

      expect(parsed.length).toBe(2);
    });
  });

  describe("bulkImportDiscoveryRequests", () => {
    it("should import multiple RFPs from text", async () => {
      const text = `RFP 1: All bank statements.
RFP 2: All tax returns.
RFP 3: All pay stubs.`;

      const result = await bulkImportDiscoveryRequests(mockCaseId, text, mockUserId);

      expect(result.imported).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.requests.length).toBe(3);
    });

    it("should auto-detect category hints during import", async () => {
      const text = `RFP 1: All bank statements and financial records.
RFP 2: All medical bills and health insurance documents.
RFP 3: All employment contracts and agreements.`;

      const result = await bulkImportDiscoveryRequests(mockCaseId, text, mockUserId);

      expect(result.requests[0].categoryHint).toBe("Financial");
      expect(result.requests[1].categoryHint).toBe("Medical");
      expect(result.requests[2].categoryHint).toBe("Employment");
    });

    it("should report errors for duplicate numbers", async () => {
      // First import
      await bulkImportDiscoveryRequests(
        mockCaseId,
        "RFP 1: First request.",
        mockUserId
      );

      // Second import with same number
      const result = await bulkImportDiscoveryRequests(
        mockCaseId,
        "RFP 1: Duplicate number.",
        mockUserId
      );

      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toMatch(/duplicate|already exists/i);
    });

    it("should handle CSV format", async () => {
      const csv = `type,number,text
RFP,1,All bank statements
RFP,2,All tax returns
Interrogatory,1,State your income`;

      const result = await bulkImportDiscoveryRequests(mockCaseId, csv, mockUserId);

      expect(result.imported).toBe(3);
    });

    it("should return partial success when some imports fail", async () => {
      const text = `RFP 1: Valid request.
Invalid line that should be skipped.
RFP 2: Another valid request.`;

      const result = await bulkImportDiscoveryRequests(mockCaseId, text, mockUserId);

      expect(result.imported).toBe(2);
      expect(result.failed).toBe(0); // Invalid lines are skipped, not counted as failures
    });
  });
});

describe("Category Detection", () => {
  describe("detectCategoryFromText", () => {
    const testCases = [
      {
        text: "All bank statements, checking and savings accounts",
        expected: "Financial",
      },
      {
        text: "All tax returns, W-2s, and 1099 forms",
        expected: "Financial",
      },
      {
        text: "All medical records, hospital bills, and prescriptions",
        expected: "Medical",
      },
      {
        text: "All employment contracts and pay stubs",
        expected: "Employment",
      },
      {
        text: "Property deeds, home appraisals, and real estate titles",
        expected: "Property",
      },
      {
        text: "Marriage certificate and prenuptial agreement",
        expected: "Legal",
      },
      {
        text: "Birth certificates and passport copies",
        expected: "Personal",
      },
      {
        text: "Some random unrelated request",
        expected: null,
      },
    ];

    it.each(testCases)("should detect '$expected' from '$text'", ({ text, expected }) => {
      // This is a unit test for the category detection helper
      // Using the imported detectCategoryFromText function
      const result = detectCategoryFromText(text);
      expect(result).toBe(expected);
    });
  });
});

describe("Request Numbering", () => {
  const mockUserId = "user_test123";
  const mockCaseId = "case_test456";

  it("should suggest next available RFP number", async () => {
    // Create RFPs 1, 2, 3
    await createDiscoveryRequest(
      { caseId: mockCaseId, type: "RFP", number: 1, text: "Request 1" },
      mockUserId
    );
    await createDiscoveryRequest(
      { caseId: mockCaseId, type: "RFP", number: 2, text: "Request 2" },
      mockUserId
    );
    await createDiscoveryRequest(
      { caseId: mockCaseId, type: "RFP", number: 3, text: "Request 3" },
      mockUserId
    );

    // Next available should be 4
    const { getNextRequestNumber } = await import("@/lib/discovery/requests");
    const nextNumber = await getNextRequestNumber(mockCaseId, "RFP", mockUserId);

    expect(nextNumber).toBe(4);
  });

  it("should handle gaps in numbering", async () => {
    // Create RFPs 1 and 5 (with gap)
    await createDiscoveryRequest(
      { caseId: mockCaseId, type: "RFP", number: 1, text: "Request 1" },
      mockUserId
    );
    await createDiscoveryRequest(
      { caseId: mockCaseId, type: "RFP", number: 5, text: "Request 5" },
      mockUserId
    );

    // Next available should be 6 (after highest)
    const { getNextRequestNumber } = await import("@/lib/discovery/requests");
    const nextNumber = await getNextRequestNumber(mockCaseId, "RFP", mockUserId);

    expect(nextNumber).toBe(6);
  });

  it("should track RFP and Interrogatory numbers separately", async () => {
    await createDiscoveryRequest(
      { caseId: mockCaseId, type: "RFP", number: 1, text: "RFP 1" },
      mockUserId
    );
    await createDiscoveryRequest(
      { caseId: mockCaseId, type: "Interrogatory", number: 1, text: "Interrog 1" },
      mockUserId
    );

    const { getNextRequestNumber } = await import("@/lib/discovery/requests");

    const nextRFP = await getNextRequestNumber(mockCaseId, "RFP", mockUserId);
    const nextInterrog = await getNextRequestNumber(mockCaseId, "Interrogatory", mockUserId);

    expect(nextRFP).toBe(2);
    expect(nextInterrog).toBe(2);
  });
});
