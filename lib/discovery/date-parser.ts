/**
 * Date Range Parser for Discovery Requests
 * Phase 8: Discovery Request Tracking
 *
 * Parse date ranges from request text and match documents
 */

export interface ParsedDateRange {
  startDate: string | null;
  endDate: string | null;
  isRelative: boolean;
  isOpenEnded: boolean;
  originalText: string;
}

export interface DateMatchResult {
  matches: boolean;
  overlapPercentage: number;
  overlapDays: number;
  totalDays: number;
}

// Month name mappings
const MONTHS: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

/**
 * Parse date range from request text
 */
export function parseDateRangeFromText(text: string): ParsedDateRange {
  const normalizedText = text.toLowerCase();

  // Pattern: "from [date] to [date/present]"
  const fromToMatch = normalizedText.match(
    /from\s+(.+?)\s+(?:to|through|until)\s+(.+?)(?:\.|$)/i
  );
  if (fromToMatch) {
    const startDate = parseDate(fromToMatch[1]);
    const endText = fromToMatch[2].trim();
    const isPresent = /present|current|now|today/i.test(endText);

    return {
      startDate,
      endDate: isPresent ? null : parseDate(endText),
      isRelative: false,
      isOpenEnded: isPresent,
      originalText: fromToMatch[0],
    };
  }

  // Pattern: "for the years YYYY-YYYY" or "years YYYY through YYYY"
  const yearRangeMatch = normalizedText.match(
    /(?:for\s+)?(?:the\s+)?years?\s+(\d{4})\s*[-–—]\s*(\d{4})/i
  );
  if (yearRangeMatch) {
    const startYear = parseInt(yearRangeMatch[1], 10);
    const endYear = parseInt(yearRangeMatch[2], 10);

    return {
      startDate: `${startYear}-01-01`,
      endDate: `${endYear}-12-31`,
      isRelative: false,
      isOpenEnded: false,
      originalText: yearRangeMatch[0],
    };
  }

  // Pattern: "for the past X months/years"
  const pastMatch = normalizedText.match(
    /(?:for\s+)?(?:the\s+)?(?:past|last)\s+(\d+)\s+(months?|years?)/i
  );
  if (pastMatch) {
    const amount = parseInt(pastMatch[1], 10);
    const unit = pastMatch[2].toLowerCase();

    return {
      startDate: `relative:-${amount}${unit.startsWith("month") ? "months" : "years"}`,
      endDate: null,
      isRelative: true,
      isOpenEnded: true,
      originalText: pastMatch[0],
    };
  }

  // Pattern: "during calendar year YYYY"
  const calendarYearMatch = normalizedText.match(
    /(?:during\s+)?(?:calendar\s+)?year\s+(\d{4})/i
  );
  if (calendarYearMatch) {
    const year = parseInt(calendarYearMatch[1], 10);

    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      isRelative: false,
      isOpenEnded: false,
      originalText: calendarYearMatch[0],
    };
  }

  // Pattern: "Month DD, YYYY through Month DD, YYYY"
  const fullDateRangeMatch = normalizedText.match(
    /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\s+(?:through|to|until)\s+(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i
  );
  if (fullDateRangeMatch) {
    const startMonth = MONTHS[fullDateRangeMatch[1].toLowerCase()];
    const startDay = parseInt(fullDateRangeMatch[2], 10);
    const startYear = parseInt(fullDateRangeMatch[3], 10);
    const endMonth = MONTHS[fullDateRangeMatch[4].toLowerCase()];
    const endDay = parseInt(fullDateRangeMatch[5], 10);
    const endYear = parseInt(fullDateRangeMatch[6], 10);

    if (startMonth !== undefined && endMonth !== undefined) {
      return {
        startDate: formatDate(startYear, startMonth, startDay),
        endDate: formatDate(endYear, endMonth, endDay),
        isRelative: false,
        isOpenEnded: false,
        originalText: fullDateRangeMatch[0],
      };
    }
  }

  // No date range found
  return {
    startDate: null,
    endDate: null,
    isRelative: false,
    isOpenEnded: false,
    originalText: "",
  };
}

/**
 * Parse a single date string
 */
function parseDate(text: string): string | null {
  const trimmed = text.trim().toLowerCase();

  // YYYY format
  const yearMatch = trimmed.match(/^(\d{4})$/);
  if (yearMatch) {
    return `${yearMatch[1]}-01-01`;
  }

  // Month YYYY format
  const monthYearMatch = trimmed.match(/^(\w+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const month = MONTHS[monthYearMatch[1]];
    if (month !== undefined) {
      return formatDate(parseInt(monthYearMatch[2], 10), month, 1);
    }
  }

  // Month DD, YYYY format
  const fullDateMatch = trimmed.match(/^(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (fullDateMatch) {
    const month = MONTHS[fullDateMatch[1]];
    if (month !== undefined) {
      return formatDate(
        parseInt(fullDateMatch[3], 10),
        month,
        parseInt(fullDateMatch[2], 10)
      );
    }
  }

  return null;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Convert relative date to absolute date
 */
export function resolveRelativeDate(relativeDate: string): string {
  const match = relativeDate.match(/^relative:-(\d+)(months?|years?)$/);
  if (!match) return relativeDate;

  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const now = new Date();

  if (unit.startsWith("month")) {
    now.setMonth(now.getMonth() - amount);
  } else if (unit.startsWith("year")) {
    now.setFullYear(now.getFullYear() - amount);
  }

  return formatDate(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Match document dates to a date range
 */
export function matchDocumentToDateRange(
  document: { metadata: { startDate?: string; endDate?: string } | null },
  dateRange: { startDate: string | null; endDate: string | null }
): DateMatchResult {
  // No date range specified - everything matches
  if (!dateRange.startDate && !dateRange.endDate) {
    return {
      matches: true,
      overlapPercentage: 100,
      overlapDays: 0,
      totalDays: 0,
    };
  }

  // Document has no date metadata
  if (!document.metadata?.startDate && !document.metadata?.endDate) {
    return {
      matches: false,
      overlapPercentage: 0,
      overlapDays: 0,
      totalDays: 0,
    };
  }

  // Parse dates
  const docStart = document.metadata.startDate
    ? new Date(document.metadata.startDate)
    : null;
  const docEnd = document.metadata.endDate
    ? new Date(document.metadata.endDate)
    : docStart;

  let rangeStart = dateRange.startDate
    ? dateRange.startDate.startsWith("relative:")
      ? new Date(resolveRelativeDate(dateRange.startDate))
      : new Date(dateRange.startDate)
    : null;
  let rangeEnd = dateRange.endDate ? new Date(dateRange.endDate) : new Date();

  // If no document dates, no match
  if (!docStart) {
    return {
      matches: false,
      overlapPercentage: 0,
      overlapDays: 0,
      totalDays: 0,
    };
  }

  // Calculate overlap
  const docStartTime = docStart.getTime();
  const docEndTime = (docEnd || docStart).getTime();
  const rangeStartTime = rangeStart ? rangeStart.getTime() : 0;
  const rangeEndTime = rangeEnd.getTime();

  // Check for any overlap
  const overlapStart = Math.max(docStartTime, rangeStartTime);
  const overlapEnd = Math.min(docEndTime, rangeEndTime);

  if (overlapStart > overlapEnd) {
    // No overlap
    return {
      matches: false,
      overlapPercentage: 0,
      overlapDays: 0,
      totalDays: Math.ceil((docEndTime - docStartTime) / (1000 * 60 * 60 * 24)),
    };
  }

  const overlapDays = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
  const totalDays = Math.ceil((docEndTime - docStartTime) / (1000 * 60 * 60 * 24)) || 1;
  const overlapPercentage = Math.round((overlapDays / totalDays) * 100);

  return {
    matches: true,
    overlapPercentage: Math.min(overlapPercentage, 100),
    overlapDays,
    totalDays,
  };
}
