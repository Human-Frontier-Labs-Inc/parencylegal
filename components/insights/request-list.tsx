"use client";

/**
 * Request List
 * Phase 5: Interactive list showing request-to-document mappings
 *
 * Features:
 * - Expandable request rows
 * - Status icons (Complete/Partial/Missing)
 * - Matched documents shown on expand
 * - Filter by status
 * - Click-through to document viewer
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  FileCheck,
  Search,
  Filter,
  Eye,
  ExternalLink,
} from "lucide-react";

interface MatchedDocument {
  id: string;
  fileName: string;
  category: string | null;
  subtype: string | null;
  confidence: number | null;
  matchScore: number;
  matchReason?: string;
}

interface DiscoveryRequest {
  id: string;
  type: "RFP" | "Interrogatory";
  number: number;
  text: string;
  categoryHint: string | null;
  status: "complete" | "partial" | "incomplete";
  completionPercentage: number;
  matchingDocuments: MatchedDocument[];
}

interface RequestListProps {
  requests: DiscoveryRequest[];
  onDocumentClick?: (documentId: string) => void;
  isLoading?: boolean;
}

type FilterStatus = "all" | "complete" | "partial" | "incomplete";

export function RequestList({
  requests,
  onDocumentClick,
  isLoading = false,
}: RequestListProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());

  // Filter requests based on status and search
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Status filter
      if (filterStatus !== "all" && req.status !== filterStatus) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          req.text.toLowerCase().includes(query) ||
          req.type.toLowerCase().includes(query) ||
          req.categoryHint?.toLowerCase().includes(query) ||
          req.number.toString().includes(query)
        );
      }

      return true;
    });
  }, [requests, filterStatus, searchQuery]);

  // Toggle request expansion
  const toggleExpand = (requestId: string) => {
    setExpandedRequests((prev) => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  // Expand all / Collapse all
  const expandAll = () => {
    setExpandedRequests(new Set(filteredRequests.map((r) => r.id)));
  };

  const collapseAll = () => {
    setExpandedRequests(new Set());
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "partial":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  // Get status color classes
  const getStatusClasses = (status: string) => {
    switch (status) {
      case "complete":
        return "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800";
      case "partial":
        return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800";
      default:
        return "bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800";
    }
  };

  if (requests.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="p-4 bg-muted rounded-full mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Requests to Display</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Upload an RFP document or paste your requests to see the compliance analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-lg">Request Details</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filterStatus}
            onValueChange={(v) => setFilterStatus(v as FilterStatus)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Requests</SelectItem>
              <SelectItem value="complete">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Complete
                </span>
              </SelectItem>
              <SelectItem value="partial">
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-3 w-3 text-yellow-600" />
                  Partial
                </span>
              </SelectItem>
              <SelectItem value="incomplete">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-red-500" />
                  Missing
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <Collapsible
                key={request.id}
                open={expandedRequests.has(request.id)}
                onOpenChange={() => toggleExpand(request.id)}
              >
                <div
                  className={`rounded-lg border transition-colors ${getStatusClasses(request.status)}`}
                >
                  {/* Request Header */}
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-4 text-left">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getStatusIcon(request.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">
                                {request.type} {request.number}
                              </span>
                              {request.categoryHint && (
                                <Badge variant="outline" className="text-xs">
                                  {request.categoryHint}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {request.text}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <div className="text-right">
                            <span className="text-sm font-medium">
                              {request.completionPercentage}%
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {request.matchingDocuments.length} doc
                              {request.matchingDocuments.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                          {expandedRequests.has(request.id) ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  {/* Expanded Content - Matched Documents */}
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0 border-t border-inherit">
                      <div className="pt-4">
                        {request.matchingDocuments.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground mb-3">
                              Matching Documents
                            </p>
                            {request.matchingDocuments.map((doc) => (
                              <button
                                key={doc.id}
                                onClick={() => onDocumentClick?.(doc.id)}
                                className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <FileCheck className="h-4 w-4 text-green-600 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate max-w-[250px]">
                                      {doc.fileName}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {doc.category && (
                                        <span className="text-xs text-muted-foreground">
                                          {doc.category}
                                        </span>
                                      )}
                                      {doc.matchReason && (
                                        <span className="text-xs text-green-600">
                                          {doc.matchReason}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={doc.matchScore >= 80 ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {doc.matchScore}% match
                                  </Badge>
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                            <div>
                              <p className="font-medium text-sm text-red-700 dark:text-red-300">
                                No matching documents found
                              </p>
                              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                You may need to request this document from the opposing party
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>

        {/* Results summary */}
        {filteredRequests.length !== requests.length && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Showing {filteredRequests.length} of {requests.length} requests
          </p>
        )}
      </CardContent>
    </Card>
  );
}
