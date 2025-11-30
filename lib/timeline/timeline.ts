/**
 * Timeline Service
 * Phase 9: Timeline, Search & Export
 *
 * Provides chronological document timeline with filtering and aggregation
 */

import { db } from "@/db/db";
import { documentsTable, casesTable } from "@/db/schema";
import { eq, and, inArray, isNotNull, gte, lte, sql, desc, asc } from "drizzle-orm";

// Types
export interface TimelineEvent {
  id: string;
  documentId: string;
  fileName: string;
  category: string | null;
  subtype: string | null;
  date: Date | null;
  dateType: "document" | "start" | "end" | "uploaded";
  metadata: {
    startDate?: string;
    endDate?: string;
    parties?: string[];
    amounts?: number[];
    summary?: string;
    [key: string]: any;
  } | null;
}

export interface TimelineFilter {
  categories?: string[];
  startDate?: Date;
  endDate?: Date;
  documentTypes?: string[];
}

export interface TimelineResult {
  events: TimelineEvent[];
  totalEvents: number;
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
  categoryCounts: Record<string, number>;
}

export interface DateGap {
  start: Date;
  end: Date;
  daysGap: number;
  category?: string;
}

/**
 * Extract the most relevant date from a document
 */
export function extractDocumentDate(doc: {
  documentDate: Date | null;
  metadata: { startDate?: string; endDate?: string } | null;
  uploadedAt: Date | null;
}): { date: Date | null; dateType: TimelineEvent["dateType"] } {
  // Priority 1: Explicit document date
  if (doc.documentDate) {
    return { date: new Date(doc.documentDate), dateType: "document" };
  }

  // Priority 2: Metadata start date
  if (doc.metadata?.startDate) {
    const parsed = new Date(doc.metadata.startDate);
    if (!isNaN(parsed.getTime())) {
      return { date: parsed, dateType: "start" };
    }
  }

  // Priority 3: Metadata end date
  if (doc.metadata?.endDate) {
    const parsed = new Date(doc.metadata.endDate);
    if (!isNaN(parsed.getTime())) {
      return { date: parsed, dateType: "end" };
    }
  }

  // Priority 4: Upload date
  if (doc.uploadedAt) {
    return { date: new Date(doc.uploadedAt), dateType: "uploaded" };
  }

  return { date: null, dateType: "uploaded" };
}

/**
 * Sort events by date
 */
export function sortEventsByDate<T extends { date: Date | null }>(
  events: T[],
  order: "asc" | "desc" = "asc"
): T[] {
  return [...events].sort((a, b) => {
    // Null dates go to the end
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;

    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return order === "asc" ? diff : -diff;
  });
}

/**
 * Group events by year-month
 */
export function groupEventsByMonth<T extends { date: Date | null }>(
  events: T[]
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

  for (const event of events) {
    if (!event.date) continue;

    const date = new Date(event.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(event);
  }

  return grouped;
}

/**
 * Detect gaps in document dates larger than threshold
 */
export function detectDateGaps<T extends { date: Date | null }>(
  events: T[],
  thresholdDays: number = 60
): DateGap[] {
  const gaps: DateGap[] = [];

  // Filter to events with dates and sort
  const datedEvents = events.filter((e) => e.date !== null);
  const sorted = sortEventsByDate(datedEvents, "asc");

  if (sorted.length < 2) return gaps;

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].date!);
    const currDate = new Date(sorted[i].date!);

    const diffMs = currDate.getTime() - prevDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > thresholdDays) {
      gaps.push({
        start: prevDate,
        end: currDate,
        daysGap: diffDays,
      });
    }
  }

  return gaps;
}

/**
 * Get timeline events for a case
 */
export async function getTimelineEvents(
  caseId: string,
  userId: string,
  filters?: TimelineFilter
): Promise<TimelineResult> {
  // Build query conditions
  const conditions = [
    eq(documentsTable.caseId, caseId),
    eq(documentsTable.userId, userId),
  ];

  // Apply category filter
  if (filters?.categories && filters.categories.length > 0) {
    conditions.push(inArray(documentsTable.category, filters.categories));
  }

  // Apply document type filter
  if (filters?.documentTypes && filters.documentTypes.length > 0) {
    conditions.push(inArray(documentsTable.subtype, filters.documentTypes));
  }

  // Query documents
  const documents = await db
    .select({
      id: documentsTable.id,
      fileName: documentsTable.fileName,
      category: documentsTable.category,
      subtype: documentsTable.subtype,
      documentDate: documentsTable.documentDate,
      uploadedAt: documentsTable.uploadedAt,
      metadata: documentsTable.metadata,
    })
    .from(documentsTable)
    .where(and(...conditions));

  // Transform to timeline events
  let events: TimelineEvent[] = documents.map((doc) => {
    const { date, dateType } = extractDocumentDate({
      documentDate: doc.documentDate,
      metadata: doc.metadata,
      uploadedAt: doc.uploadedAt,
    });

    return {
      id: doc.id,
      documentId: doc.id,
      fileName: doc.fileName,
      category: doc.category,
      subtype: doc.subtype,
      date,
      dateType,
      metadata: doc.metadata,
    };
  });

  // Apply date range filter
  if (filters?.startDate) {
    events = events.filter((e) => {
      if (!e.date) return false;
      return new Date(e.date) >= filters.startDate!;
    });
  }

  if (filters?.endDate) {
    events = events.filter((e) => {
      if (!e.date) return false;
      return new Date(e.date) <= filters.endDate!;
    });
  }

  // Sort chronologically
  const sortedEvents = sortEventsByDate(events, "asc");

  // Calculate date range
  const datedEvents = sortedEvents.filter((e) => e.date !== null);
  const earliest = datedEvents.length > 0 ? datedEvents[0].date : null;
  const latest = datedEvents.length > 0 ? datedEvents[datedEvents.length - 1].date : null;

  // Calculate category counts
  const categoryCounts: Record<string, number> = {};
  for (const event of sortedEvents) {
    const cat = event.category || "Uncategorized";
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  return {
    events: sortedEvents,
    totalEvents: sortedEvents.length,
    dateRange: { earliest, latest },
    categoryCounts,
  };
}

/**
 * Aggregate timeline data for summary view
 */
export async function aggregateTimelineData(
  caseId: string,
  userId: string
): Promise<{
  totalDocuments: number;
  dateRangeCovered: { start: Date | null; end: Date | null };
  categorySummary: Record<string, number>;
  gaps: DateGap[];
}> {
  const result = await getTimelineEvents(caseId, userId);

  return {
    totalDocuments: result.totalEvents,
    dateRangeCovered: {
      start: result.dateRange.earliest,
      end: result.dateRange.latest,
    },
    categorySummary: result.categoryCounts,
    gaps: detectDateGaps(result.events),
  };
}

/**
 * Get available categories for a case (for filter dropdown)
 */
export async function getAvailableCategories(
  caseId: string,
  userId: string
): Promise<string[]> {
  const results = await db
    .selectDistinct({ category: documentsTable.category })
    .from(documentsTable)
    .where(
      and(
        eq(documentsTable.caseId, caseId),
        eq(documentsTable.userId, userId),
        isNotNull(documentsTable.category)
      )
    );

  return results
    .map((r) => r.category)
    .filter((c): c is string => c !== null)
    .sort();
}

/**
 * Get available document types for a case (for filter dropdown)
 */
export async function getAvailableDocumentTypes(
  caseId: string,
  userId: string
): Promise<string[]> {
  const results = await db
    .selectDistinct({ subtype: documentsTable.subtype })
    .from(documentsTable)
    .where(
      and(
        eq(documentsTable.caseId, caseId),
        eq(documentsTable.userId, userId),
        isNotNull(documentsTable.subtype)
      )
    );

  return results
    .map((r) => r.subtype)
    .filter((s): s is string => s !== null)
    .sort();
}
