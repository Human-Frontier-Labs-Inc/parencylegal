/**
 * Visual Timeline Component
 * Phase 12.5.3: Enhanced visual timeline for case documents
 *
 * Features:
 * - Vertical timeline with connected dots
 * - Category color coding
 * - Date range bars for documents spanning time periods
 * - Expandable sections
 * - Hover previews
 */
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileText,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Eye,
  DollarSign,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  id: string;
  documentId: string;
  fileName: string;
  category: string | null;
  subtype: string | null;
  date: string | null;
  dateType: "document" | "start" | "end" | "uploaded";
  metadata: {
    startDate?: string;
    endDate?: string;
    summary?: string;
    parties?: string[];
    amounts?: number[];
    [key: string]: any;
  } | null;
}

interface VisualTimelineProps {
  events: TimelineEvent[];
  caseId: string;
}

// Category colors for timeline dots and badges
const CATEGORY_COLORS: Record<string, { dot: string; bg: string; text: string; border: string }> = {
  Financial: {
    dot: "bg-green-500",
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  Medical: {
    dot: "bg-red-500",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  Legal: {
    dot: "bg-blue-500",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  Communications: {
    dot: "bg-purple-500",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  Property: {
    dot: "bg-yellow-500",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  Employment: {
    dot: "bg-orange-500",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
  },
  Personal: {
    dot: "bg-pink-500",
    bg: "bg-pink-50",
    text: "text-pink-700",
    border: "border-pink-200",
  },
  Other: {
    dot: "bg-gray-400",
    bg: "bg-gray-50",
    text: "text-gray-700",
    border: "border-gray-200",
  },
};

const getColors = (category: string | null) => {
  return CATEGORY_COLORS[category || "Other"] || CATEGORY_COLORS.Other;
};

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format date nicely
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "Unknown";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// Group events by year
const groupByYear = (events: TimelineEvent[]): Record<string, TimelineEvent[]> => {
  const grouped: Record<string, TimelineEvent[]> = {};
  const noDate: TimelineEvent[] = [];

  for (const event of events) {
    if (!event.date) {
      noDate.push(event);
      continue;
    }
    const year = new Date(event.date).getFullYear().toString();
    if (!grouped[year]) {
      grouped[year] = [];
    }
    grouped[year].push(event);
  }

  // Sort events within each year
  for (const year of Object.keys(grouped)) {
    grouped[year].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA; // Most recent first
    });
  }

  if (noDate.length > 0) {
    grouped["Unknown"] = noDate;
  }

  return grouped;
};

// Timeline Event Card
function TimelineEventCard({
  event,
  caseId,
  isLast,
}: {
  event: TimelineEvent;
  caseId: string;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const colors = getColors(event.category);

  const hasDateRange =
    event.metadata?.startDate &&
    event.metadata?.endDate &&
    event.metadata.startDate !== event.metadata.endDate;

  return (
    <div className="flex gap-4">
      {/* Timeline line and dot */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-4 h-4 rounded-full border-4 border-white shadow-md z-10",
            colors.dot
          )}
        />
        {!isLast && <div className="w-0.5 flex-1 bg-gray-200" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-8">
        {/* Date */}
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-medium">
            {formatDate(event.date)}
          </span>
          {hasDateRange && (
            <span className="text-xs text-muted-foreground">
              — {formatDate(event.metadata?.endDate || null)}
            </span>
          )}
          {event.dateType !== "document" && (
            <Badge variant="outline" className="text-xs py-0 h-5">
              {event.dateType}
            </Badge>
          )}
        </div>

        {/* Card */}
        <Card
          className={cn(
            "transition-all duration-200 hover:shadow-md cursor-pointer",
            colors.border,
            expanded && "ring-1 ring-primary"
          )}
          onClick={() => setExpanded(!expanded)}
        >
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className={cn("p-2 rounded-lg", colors.bg)}>
                  <FileText className={cn("w-4 h-4", colors.text)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{event.fileName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={cn("text-xs", colors.bg, colors.text, colors.border)}
                    >
                      {event.category || "Uncategorized"}
                    </Badge>
                    {event.subtype && (
                      <span className="text-xs text-muted-foreground">
                        {event.subtype}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
              >
                {expanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Summary (always visible if present) */}
            {event.metadata?.summary && !expanded && (
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                {event.metadata.summary}
              </p>
            )}

            {/* Expanded content */}
            {expanded && (
              <div className="mt-4 space-y-4 border-t pt-4">
                {/* Summary */}
                {event.metadata?.summary && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {event.metadata.summary}
                    </p>
                  </div>
                )}

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {/* Parties */}
                  {event.metadata?.parties && event.metadata.parties.length > 0 && (
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Parties</p>
                        <p className="font-medium">
                          {event.metadata.parties.slice(0, 3).join(", ")}
                          {event.metadata.parties.length > 3 && ` +${event.metadata.parties.length - 3}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Amounts */}
                  {event.metadata?.amounts && event.metadata.amounts.length > 0 && (
                    <div className="flex items-start gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Amounts</p>
                        <p className="font-medium">
                          {event.metadata.amounts.slice(0, 2).map(formatCurrency).join(", ")}
                          {event.metadata.amounts.length > 2 && ` +${event.metadata.amounts.length - 2}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Date Range */}
                  {hasDateRange && (
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Period</p>
                        <p className="font-medium">
                          {formatDate(event.metadata?.startDate || null)} — {formatDate(event.metadata?.endDate || null)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* View button */}
                <Link
                  href={`/dashboard/cases/${caseId}/documents/${event.documentId}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    View Document
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Year Section
function YearSection({
  year,
  events,
  caseId,
  defaultExpanded = true,
}: {
  year: string;
  events: TimelineEvent[];
  caseId: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-8">
      {/* Year Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-3 mb-4 group"
      >
        <div className="flex items-center justify-center w-16 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
          {year}
        </div>
        <Badge variant="secondary">
          {events.length} document{events.length !== 1 ? "s" : ""}
        </Badge>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </button>

      {/* Events */}
      {expanded && (
        <div className="ml-8">
          {events.map((event, idx) => (
            <TimelineEventCard
              key={event.id}
              event={event}
              caseId={caseId}
              isLast={idx === events.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function VisualTimeline({ events, caseId }: VisualTimelineProps) {
  const groupedEvents = useMemo(() => groupByYear(events), [events]);
  const years = Object.keys(groupedEvents).sort((a, b) => {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    return parseInt(b) - parseInt(a); // Most recent first
  });

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No timeline events</h3>
        <p className="text-muted-foreground">
          Documents with dates will appear here in chronological order.
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="relative">
        {years.map((year, idx) => (
          <YearSection
            key={year}
            year={year}
            events={groupedEvents[year]}
            caseId={caseId}
            defaultExpanded={idx < 3} // Expand first 3 years by default
          />
        ))}
      </div>
    </TooltipProvider>
  );
}
