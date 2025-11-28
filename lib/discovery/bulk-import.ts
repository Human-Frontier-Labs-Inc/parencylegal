/**
 * Bulk Import for Discovery Requests
 * Phase 8: Discovery Request Tracking
 *
 * Parse and import discovery requests from text or CSV
 */

import { detectCategoryFromText } from "./category-detection";
import {
  createDiscoveryRequest,
  requestNumberExists,
  CreateDiscoveryRequestInput,
} from "./requests";

export interface ParsedRequest {
  type: "RFP" | "Interrogatory";
  number: number;
  text: string;
}

export interface BulkImportResult {
  imported: number;
  failed: number;
  requests: Array<{
    id: string;
    caseId: string;
    type: string;
    number: number;
    text: string;
    categoryHint: string | null;
    status: string;
    completionPercentage: number;
  }>;
  errors: Array<{ line: number; error: string }>;
}

// Regex patterns for parsing discovery requests
const PATTERNS = {
  // RFP 1: text, RFP NO. 1: text, RFP #1: text
  rfpColon: /^(?:RFP|REQUEST\s+FOR\s+PRODUCTION)(?:\s+(?:NO\.?|#))?\s*(\d+)\s*[:\-\.]\s*(.+)/i,

  // Interrogatory 1: text, Interrogatory No. 1: text
  interrogatoryColon:
    /^(?:INTERROGATORY|INTERROG)(?:\s+(?:NO\.?|#))?\s*(\d+)\s*[:\-\.]\s*(.+)/i,

  // CSV format header detection
  csvHeader: /^type\s*,\s*number\s*,\s*text/i,
};

/**
 * Parse discovery requests from text
 */
export function parseDiscoveryText(text: string): ParsedRequest[] {
  const lines = text.split("\n");
  const requests: ParsedRequest[] = [];
  let currentRequest: ParsedRequest | null = null;

  // Check if this is CSV format
  if (lines.length > 0 && PATTERNS.csvHeader.test(lines[0].trim())) {
    return parseCSV(lines.slice(1));
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines (but they might end a multi-line request)
    if (!line) {
      if (currentRequest) {
        requests.push(currentRequest);
        currentRequest = null;
      }
      continue;
    }

    // Try to match RFP pattern
    const rfpMatch = line.match(PATTERNS.rfpColon);
    if (rfpMatch) {
      // Save previous request if exists
      if (currentRequest) {
        requests.push(currentRequest);
      }

      currentRequest = {
        type: "RFP",
        number: parseInt(rfpMatch[1], 10),
        text: rfpMatch[2].trim(),
      };
      continue;
    }

    // Try to match Interrogatory pattern
    const interrogatoryMatch = line.match(PATTERNS.interrogatoryColon);
    if (interrogatoryMatch) {
      // Save previous request if exists
      if (currentRequest) {
        requests.push(currentRequest);
      }

      currentRequest = {
        type: "Interrogatory",
        number: parseInt(interrogatoryMatch[1], 10),
        text: interrogatoryMatch[2].trim(),
      };
      continue;
    }

    // If we have a current request, this is a continuation line
    if (currentRequest) {
      currentRequest.text += "\n" + line;
    }
    // Otherwise, this is an invalid line - skip it
  }

  // Don't forget the last request
  if (currentRequest) {
    requests.push(currentRequest);
  }

  return requests;
}

/**
 * Parse CSV format
 */
function parseCSV(lines: string[]): ParsedRequest[] {
  const requests: ParsedRequest[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Simple CSV parsing (handles basic cases)
    const parts = trimmed.split(",").map((p) => p.trim());

    if (parts.length >= 3) {
      const type = parts[0].toUpperCase();
      const number = parseInt(parts[1], 10);
      const text = parts.slice(2).join(",").trim(); // Rejoin in case text had commas

      if ((type === "RFP" || type === "INTERROGATORY") && !isNaN(number) && text) {
        requests.push({
          type: type as "RFP" | "Interrogatory",
          number,
          text,
        });
      }
    }
  }

  return requests;
}

/**
 * Bulk import discovery requests
 */
export async function bulkImportDiscoveryRequests(
  caseId: string,
  text: string,
  userId: string
): Promise<BulkImportResult> {
  const parsed = parseDiscoveryText(text);
  const result: BulkImportResult = {
    imported: 0,
    failed: 0,
    requests: [],
    errors: [],
  };

  for (let i = 0; i < parsed.length; i++) {
    const request = parsed[i];

    try {
      // Check for duplicate
      const exists = await requestNumberExists(
        caseId,
        request.type,
        request.number,
        userId
      );

      if (exists) {
        result.failed++;
        result.errors.push({
          line: i + 1,
          error: `${request.type} ${request.number} already exists`,
        });
        continue;
      }

      // Auto-detect category
      const categoryHint = detectCategoryFromText(request.text);

      // Create the request
      const created = await createDiscoveryRequest(
        {
          caseId,
          type: request.type,
          number: request.number,
          text: request.text,
          categoryHint: categoryHint || undefined,
        },
        userId
      );

      result.imported++;
      result.requests.push({
        id: created.id,
        caseId: created.caseId,
        type: created.type,
        number: created.number,
        text: created.text,
        categoryHint: created.categoryHint,
        status: created.status,
        completionPercentage: created.completionPercentage || 0,
      });
    } catch (error: any) {
      result.failed++;
      result.errors.push({
        line: i + 1,
        error: error.message || "Unknown error",
      });
    }
  }

  return result;
}

/**
 * Validate import text before processing
 */
export function validateImportText(text: string): {
  valid: boolean;
  count: number;
  errors: string[];
} {
  const parsed = parseDiscoveryText(text);
  const errors: string[] = [];

  if (parsed.length === 0) {
    errors.push("No valid discovery requests found in the text");
  }

  // Check for duplicate numbers within the import
  const seen = new Set<string>();
  for (const request of parsed) {
    const key = `${request.type}-${request.number}`;
    if (seen.has(key)) {
      errors.push(`Duplicate ${request.type} ${request.number} in import`);
    }
    seen.add(key);
  }

  return {
    valid: errors.length === 0,
    count: parsed.length,
    errors,
  };
}
