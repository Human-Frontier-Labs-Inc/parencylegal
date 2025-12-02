"use client";

/**
 * Discovery Compliance Panel (Redesigned)
 * Phase 6: Integrated Insights Tab with RFP upload, compliance dashboard, and request list
 *
 * New Flow:
 * 1. User uploads PDF or pastes RFP text
 * 2. System parses requests and matches to documents
 * 3. Dashboard shows compliance score and stats
 * 4. Request list shows detailed mappings
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { RfpInputPanel } from "./rfp-input-panel";
import { ComplianceDashboard } from "./compliance-dashboard";
import { RequestList } from "./request-list";

interface ParsedRequest {
  type: "RFP" | "Interrogatory";
  number: number;
  text: string;
  suggestedCategory: string | null;
  confidence: number;
}

interface ParseResult {
  requests: ParsedRequest[];
  metadata: {
    totalExtracted: number;
    documentTitle?: string;
    parseConfidence: number;
  };
}

interface MatchedDocument {
  id: string;
  fileName: string;
  category: string | null;
  subtype: string | null;
  confidence: number | null;
  matchScore: number;
  matchReason?: string;
}

interface AnalyzedRequest {
  id: string;
  type: "RFP" | "Interrogatory";
  number: number;
  text: string;
  categoryHint: string | null;
  status: "complete" | "partial" | "incomplete";
  completionPercentage: number;
  matchingDocuments: MatchedDocument[];
}

interface ComplianceStats {
  totalRequests: number;
  completeRequests: number;
  partialRequests: number;
  incompleteRequests: number;
  overallComplianceScore: number;
  documentsWithMatches: number;
  unmatchedDocuments: number;
  totalDocuments: number;
}

interface DiscoveryCompliancePanelProps {
  caseId: string;
  caseName?: string;
  onDocumentClick?: (documentId: string) => void;
}

export function DiscoveryCompliancePanel({
  caseId,
  caseName,
  onDocumentClick,
}: DiscoveryCompliancePanelProps) {
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [stats, setStats] = useState<ComplianceStats>({
    totalRequests: 0,
    completeRequests: 0,
    partialRequests: 0,
    incompleteRequests: 0,
    overallComplianceScore: 0,
    documentsWithMatches: 0,
    unmatchedDocuments: 0,
    totalDocuments: 0,
  });
  const [requests, setRequests] = useState<AnalyzedRequest[]>([]);
  const [showInputPanel, setShowInputPanel] = useState(true);

  // Fetch existing analysis on mount
  const fetchExistingAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/discovery/analyze`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRequests(data.results || []);

        // Hide input panel if we have existing requests
        if (data.results && data.results.length > 0) {
          setShowInputPanel(false);
        }
      }
    } catch (error) {
      console.error("Failed to fetch analysis:", error);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchExistingAnalysis();
  }, [fetchExistingAnalysis]);

  // Handle parsed requests from input panel
  const handleRequestsParsed = async (result: ParseResult) => {
    if (result.requests.length === 0) {
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/discovery/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: result.requests,
          clearExisting: true, // Replace existing requests
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRequests(data.results || []);
        setShowInputPanel(false);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to analyze requests");
      }
    } catch (error) {
      console.error("Failed to analyze requests:", error);
      alert("Failed to analyze requests. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Refresh analysis (re-run matching on existing requests)
  const handleRefresh = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/discovery/analyze`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRequests(data.results || []);
      }
    } catch (error) {
      console.error("Failed to refresh analysis:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  // Clear all requests and start over
  const handleClearRequests = async () => {
    try {
      // Delete all requests via API
      const response = await fetch(`/api/cases/${caseId}/discovery`, {
        method: "DELETE",
      });

      if (response.ok) {
        setStats({
          totalRequests: 0,
          completeRequests: 0,
          partialRequests: 0,
          incompleteRequests: 0,
          overallComplianceScore: 0,
          documentsWithMatches: 0,
          unmatchedDocuments: 0,
          totalDocuments: 0,
        });
        setRequests([]);
        setShowInputPanel(true);
      }
    } catch (error) {
      console.error("Failed to clear requests:", error);
    }
  };

  // Show new analysis button
  const handleNewAnalysis = () => {
    setShowInputPanel(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Input Panel - Show at top when visible */}
      {showInputPanel && (
        <RfpInputPanel
          caseId={caseId}
          onRequestsParsed={handleRequestsParsed}
          onAnalyzeExisting={
            requests.length > 0 ? () => setShowInputPanel(false) : undefined
          }
          existingRequestCount={requests.length}
        />
      )}

      {/* Analysis Results */}
      {!showInputPanel && requests.length > 0 && (
        <>
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={analyzing}
              >
                {analyzing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh Analysis
              </Button>
              <Button variant="outline" size="sm" onClick={handleNewAnalysis}>
                New Analysis
              </Button>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Requests?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove all {requests.length} discovery requests and their
                    compliance analysis. You can upload new requests afterward.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearRequests}>
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Compliance Dashboard */}
          <ComplianceDashboard stats={stats} />

          {/* Request List */}
          <RequestList
            requests={requests}
            onDocumentClick={onDocumentClick}
          />
        </>
      )}

      {/* Empty State - No requests and input panel is hidden */}
      {!showInputPanel && requests.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              No discovery requests have been analyzed yet.
            </p>
            <Button onClick={handleNewAnalysis}>Start New Analysis</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
