"use client";

/**
 * Case Timeline Page
 * Phase 9: Timeline, Search & Export
 *
 * Chronological view of all case documents
 */

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Loader2,
  AlertCircle,
  Filter,
  Clock,
  ChevronDown,
  ChevronRight,
  Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";

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
    [key: string]: any;
  } | null;
}

interface TimelineData {
  caseId: string;
  caseName: string;
  events: TimelineEvent[];
  totalEvents: number;
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
  categoryCounts: Record<string, number>;
  filters: {
    available: {
      categories: string[];
      documentTypes: string[];
    };
    applied: any;
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  Financial: "bg-green-100 text-green-800 border-green-200",
  Medical: "bg-red-100 text-red-800 border-red-200",
  Legal: "bg-blue-100 text-blue-800 border-blue-200",
  Communications: "bg-purple-100 text-purple-800 border-purple-200",
  Property: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Employment: "bg-orange-100 text-orange-800 border-orange-200",
  Personal: "bg-pink-100 text-pink-800 border-pink-200",
  Uncategorized: "bg-gray-100 text-gray-800 border-gray-200",
};

export default function TimelinePage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // UI state
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchTimeline();
  }, [caseId, selectedCategories, startDate, endDate]);

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (selectedCategories.length > 0) {
        params.set("categories", selectedCategories.join(","));
      }
      if (startDate) {
        params.set("startDate", startDate);
      }
      if (endDate) {
        params.set("endDate", endDate);
      }

      const url = `/api/cases/${caseId}/timeline${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Case not found");
        } else {
          const err = await response.json();
          setError(err.error || "Failed to load timeline");
        }
        return;
      }

      const result = await response.json();
      setData(result);

      // Expand all months by default
      if (result.events.length > 0) {
        const months = new Set<string>();
        result.events.forEach((event: TimelineEvent) => {
          if (event.date) {
            const date = new Date(event.date);
            months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
          }
        });
        setExpandedMonths(months);
      }
    } catch (err) {
      console.error("Failed to fetch timeline:", err);
      setError("Failed to load timeline");
    } finally {
      setLoading(false);
    }
  };

  // Group events by month
  const groupedEvents = useMemo(() => {
    if (!data?.events) return {};

    const grouped: Record<string, TimelineEvent[]> = {};
    const noDateEvents: TimelineEvent[] = [];

    for (const event of data.events) {
      if (!event.date) {
        noDateEvents.push(event);
        continue;
      }

      const date = new Date(event.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(event);
    }

    if (noDateEvents.length > 0) {
      grouped["No Date"] = noDateEvents;
    }

    return grouped;
  }, [data?.events]);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  const formatMonthKey = (key: string): string => {
    if (key === "No Date") return "No Date";
    const [year, month] = key.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "No date";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setStartDate("");
    setEndDate("");
  };

  if (loading) {
    return (
      <main className="p-6 md:p-10">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6 md:p-10">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">{error}</h3>
          <Link href="/dashboard/cases">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cases
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6 md:p-10">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <Link
            href={`/dashboard/cases/${caseId}`}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Case
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Document Timeline
          </h1>
          <p className="text-muted-foreground mt-1">{data?.caseName}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/cases/${caseId}/export`)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Timeline
          </Button>
        </div>
      </div>

      {/* Date Range Summary */}
      {data?.dateRange.earliest && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date Range</p>
                  <p className="font-medium">
                    {formatDate(data.dateRange.earliest)} — {formatDate(data.dateRange.latest)}
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                {Object.entries(data.categoryCounts || {}).map(([cat, count]) => (
                  <Badge
                    key={cat}
                    variant="outline"
                    className={CATEGORY_COLORS[cat] || CATEGORY_COLORS.Uncategorized}
                  >
                    {cat}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Category</label>
              <Select
                value={selectedCategories[0] || "all"}
                onValueChange={(val) => setSelectedCategories(val === "all" ? [] : [val])}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {data?.filters.available.categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            {(selectedCategories.length > 0 || startDate || endDate) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
          <CardDescription>
            {data?.totalEvents || 0} document{(data?.totalEvents || 0) !== 1 ? "s" : ""} arranged
            chronologically
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedEvents).length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents found</h3>
              <p className="text-muted-foreground">
                {selectedCategories.length > 0 || startDate || endDate
                  ? "Try adjusting your filters"
                  : "Documents with dates will appear here"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedEvents)
                .sort(([a], [b]) => {
                  if (a === "No Date") return 1;
                  if (b === "No Date") return -1;
                  return b.localeCompare(a);
                })
                .map(([monthKey, events]) => (
                  <div key={monthKey} className="border rounded-lg">
                    <button
                      onClick={() => toggleMonth(monthKey)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedMonths.has(monthKey) ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                        <span className="font-semibold">{formatMonthKey(monthKey)}</span>
                      </div>
                      <Badge variant="secondary">{events.length} document{events.length !== 1 ? "s" : ""}</Badge>
                    </button>

                    {expandedMonths.has(monthKey) && (
                      <div className="border-t">
                        {events.map((event, idx) => (
                          <Link
                            key={event.id}
                            href={`/dashboard/cases/${caseId}/documents/${event.documentId}`}
                          >
                            <div
                              className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors ${
                                idx < events.length - 1 ? "border-b" : ""
                              }`}
                            >
                              {/* Date */}
                              <div className="w-24 text-sm text-muted-foreground">
                                {event.date ? (
                                  <span>
                                    {new Date(event.date).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                ) : (
                                  <span className="italic">No date</span>
                                )}
                              </div>

                              {/* Timeline dot */}
                              <div className="relative">
                                <div
                                  className={`w-3 h-3 rounded-full border-2 ${
                                    CATEGORY_COLORS[event.category || "Uncategorized"]
                                      ?.replace("bg-", "border-")
                                      .split(" ")[0] || "border-gray-300"
                                  } bg-white`}
                                />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium truncate">
                                    {event.fileName}
                                  </span>
                                </div>
                                {event.metadata?.summary && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                    {event.metadata.summary}
                                  </p>
                                )}
                              </div>

                              {/* Category badge */}
                              {event.category && (
                                <Badge
                                  variant="outline"
                                  className={CATEGORY_COLORS[event.category] || CATEGORY_COLORS.Uncategorized}
                                >
                                  {event.category}
                                </Badge>
                              )}

                              {/* Date type indicator */}
                              {event.dateType !== "document" && (
                                <span className="text-xs text-muted-foreground">
                                  ({event.dateType})
                                </span>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
