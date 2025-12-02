"use client";

/**
 * Discovery Compliance Panel
 * Combined Insights + Discovery Requests with compliance mapping
 *
 * Features:
 * - Upload/paste discovery requests (RFPs, Interrogatories)
 * - See document-to-request mapping and compliance stats
 * - Gap analysis showing missing documents for requests
 * - Overall compliance score
 */

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  ChevronRight,
  Calendar,
  RefreshCw,
  Loader2,
  BarChart3,
  Target,
  Upload,
  Plus,
  Sparkles,
  FileCheck,
  FileX,
  ClipboardList,
  Eye,
  Check,
  X,
} from "lucide-react";

interface DiscoveryRequest {
  id: string;
  type: "RFP" | "Interrogatory";
  number: number;
  text: string;
  categoryHint: string | null;
  status: "incomplete" | "complete" | "partial";
  completionPercentage: number;
  matchingDocumentCount: number;
  matchingDocumentIds: string[];
  notes: string | null;
}

interface Document {
  id: string;
  fileName: string;
  category: string | null;
  subtype: string | null;
  confidence: number | null;
  metadata?: {
    summary?: string;
    startDate?: string;
    endDate?: string;
  };
}

interface ComplianceStats {
  totalRequests: number;
  completeRequests: number;
  partialRequests: number;
  incompleteRequests: number;
  overallComplianceScore: number;
  documentsWithMatches: number;
  unmatchedDocuments: number;
  categoryBreakdown: Record<string, { requested: number; found: number }>;
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
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<DiscoveryRequest[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<ComplianceStats | null>(null);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DiscoveryRequest | null>(null);

  // Form states
  const [newRequest, setNewRequest] = useState({ type: "RFP", number: 1, text: "", categoryHint: "" });
  const [importText, setImportText] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [suggestingDocs, setSuggestingDocs] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [caseId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch discovery requests with stats
      const [requestsRes, docsRes] = await Promise.all([
        fetch(`/api/cases/${caseId}/discovery?stats=true`),
        fetch(`/api/cases/${caseId}/documents`),
      ]);

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setRequests(data.requests || []);
      }

      if (docsRes.ok) {
        const data = await docsRes.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate compliance stats
  const complianceStats = useMemo((): ComplianceStats => {
    const totalRequests = requests.length;
    const completeRequests = requests.filter(r => r.status === "complete").length;
    const partialRequests = requests.filter(r => r.status === "partial").length;
    const incompleteRequests = requests.filter(r => r.status === "incomplete").length;

    // Calculate overall compliance score
    let overallScore = 0;
    if (totalRequests > 0) {
      const totalCompletion = requests.reduce((sum, r) => sum + r.completionPercentage, 0);
      overallScore = Math.round(totalCompletion / totalRequests);
    }

    // Count documents with matches
    const matchedDocIds = new Set(requests.flatMap(r => r.matchingDocumentIds || []));
    const documentsWithMatches = matchedDocIds.size;
    const unmatchedDocuments = documents.filter(d => !matchedDocIds.has(d.id)).length;

    // Category breakdown
    const categoryBreakdown: Record<string, { requested: number; found: number }> = {};
    for (const req of requests) {
      if (req.categoryHint) {
        if (!categoryBreakdown[req.categoryHint]) {
          categoryBreakdown[req.categoryHint] = { requested: 0, found: 0 };
        }
        categoryBreakdown[req.categoryHint].requested++;
        if (req.matchingDocumentCount > 0) {
          categoryBreakdown[req.categoryHint].found++;
        }
      }
    }

    return {
      totalRequests,
      completeRequests,
      partialRequests,
      incompleteRequests,
      overallComplianceScore: overallScore,
      documentsWithMatches,
      unmatchedDocuments,
      categoryBreakdown,
    };
  }, [requests, documents]);

  // Add single request
  const handleAddRequest = async () => {
    if (!newRequest.text.trim()) return;

    setAdding(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/discovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRequest),
      });

      if (response.ok) {
        setShowAddDialog(false);
        setNewRequest({ type: "RFP", number: requests.length + 2, text: "", categoryHint: "" });
        await fetchData();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add request");
      }
    } catch (error) {
      console.error("Failed to add request:", error);
    } finally {
      setAdding(false);
    }
  };

  // Bulk import
  const handleImport = async () => {
    if (!importText.trim()) return;

    setImporting(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/discovery/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: importText }),
      });

      const data = await response.json();
      if (data.imported > 0) {
        setShowImportDialog(false);
        setImportText("");
        await fetchData();
      }
      alert(`Imported ${data.imported} requests. ${data.failed} failed.`);
    } catch (error) {
      console.error("Failed to import:", error);
    } finally {
      setImporting(false);
    }
  };

  // Suggest documents for request
  const handleSuggestDocuments = async (requestId: string) => {
    setSuggestingDocs(true);
    try {
      const response = await fetch(
        `/api/cases/${caseId}/discovery/${requestId}/suggest`,
        { method: "POST" }
      );
      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to suggest documents:", error);
    } finally {
      setSuggestingDocs(false);
    }
  };

  // Get matched documents for a request
  const getMatchedDocuments = (request: DiscoveryRequest): Document[] => {
    return documents.filter(d => request.matchingDocumentIds?.includes(d.id));
  };

  // Get unmatched documents (extra documents not requested)
  const unmatchedDocs = useMemo(() => {
    const matchedIds = new Set(requests.flatMap(r => r.matchingDocumentIds || []));
    return documents.filter(d => !matchedIds.has(d.id) && d.category);
  }, [requests, documents]);

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
      {/* Compliance Score Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Discovery Compliance
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <Progress
                value={complianceStats.overallComplianceScore}
                className="h-4"
              />
            </div>
            <span className="text-3xl font-bold">{complianceStats.overallComplianceScore}%</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {complianceStats.completeRequests} of {complianceStats.totalRequests} requests fully satisfied
          </p>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-green-50 dark:bg-green-950 border-green-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-700">{complianceStats.completeRequests}</p>
                <p className="text-xs text-green-600">Complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-700">{complianceStats.partialRequests}</p>
                <p className="text-xs text-yellow-600">Partial</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-950 border-red-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-700">{complianceStats.incompleteRequests}</p>
                <p className="text-xs text-red-600">Missing</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-700">{complianceStats.unmatchedDocuments}</p>
                <p className="text-xs text-blue-600">Extra Docs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue={requests.length === 0 ? "add" : "requests"} className="space-y-4">
        <TabsList>
          <TabsTrigger value="requests">
            Discovery Requests
            {requests.length > 0 && (
              <Badge variant="secondary" className="ml-2">{requests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="gaps">
            <span className="flex items-center gap-1">
              Gaps & Extras
              {(complianceStats.incompleteRequests > 0 || unmatchedDocs.length > 0) && (
                <AlertTriangle className="h-3 w-3 text-orange-500" />
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="add">Add Requests</TabsTrigger>
        </TabsList>

        {/* Discovery Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Your Discovery Requests</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowImportDialog(true)}>
                  <Upload className="h-4 w-4 mr-1" />
                  Bulk Import
                </Button>
              </div>
              <CardDescription>
                Documents received mapped to your discovery requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No discovery requests yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your RFPs or Interrogatories to see how documents map to your requests
                  </p>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Request
                  </Button>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-3">
                    {requests.map((req) => (
                      <div
                        key={req.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          req.status === "complete"
                            ? "bg-green-50 border-green-200 dark:bg-green-950"
                            : req.status === "partial"
                            ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950"
                            : "bg-gray-50 border-gray-200 dark:bg-gray-900"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {req.status === "complete" ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : req.status === "partial" ? (
                              <AlertCircle className="h-5 w-5 text-yellow-600" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-gray-400" />
                            )}
                            <span className="font-semibold">{req.type} {req.number}</span>
                            {req.categoryHint && (
                              <Badge variant="outline" className="text-xs">{req.categoryHint}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{req.completionPercentage}%</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSuggestDocuments(req.id)}
                              disabled={suggestingDocs}
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{req.text}</p>

                        {/* Matched Documents */}
                        {req.matchingDocumentCount > 0 ? (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              {req.matchingDocumentCount} document{req.matchingDocumentCount !== 1 ? "s" : ""} matched:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {getMatchedDocuments(req).slice(0, 3).map((doc) => (
                                <button
                                  key={doc.id}
                                  onClick={() => onDocumentClick?.(doc.id)}
                                  className="inline-flex items-center gap-1 text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border hover:bg-gray-100 transition-colors"
                                >
                                  <FileCheck className="h-3 w-3 text-green-600" />
                                  <span className="truncate max-w-[150px]">{doc.fileName}</span>
                                </button>
                              ))}
                              {req.matchingDocumentCount > 3 && (
                                <span className="text-xs text-muted-foreground px-2 py-1">
                                  +{req.matchingDocumentCount - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-red-600">
                            <FileX className="h-4 w-4" />
                            <span>No documents found for this request</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gaps & Extras Tab */}
        <TabsContent value="gaps">
          <div className="space-y-4">
            {/* Missing Documents for Requests */}
            {complianceStats.incompleteRequests > 0 && (
              <Card className="border-red-200 bg-red-50 dark:bg-red-950">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    Missing Documents ({complianceStats.incompleteRequests})
                  </CardTitle>
                  <CardDescription className="text-red-600">
                    These requests have no matching documents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {requests
                      .filter(r => r.matchingDocumentCount === 0)
                      .map((req) => (
                        <div
                          key={req.id}
                          className="flex items-start justify-between p-3 bg-white dark:bg-gray-900 rounded border"
                        >
                          <div>
                            <p className="font-medium text-sm">{req.type} {req.number}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{req.text}</p>
                          </div>
                          {req.categoryHint && (
                            <Badge variant="outline">{req.categoryHint}</Badge>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Extra Documents (not requested) */}
            {unmatchedDocs.length > 0 && (
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-blue-700">
                    <FileText className="h-5 w-5" />
                    Additional Documents ({unmatchedDocs.length})
                  </CardTitle>
                  <CardDescription className="text-blue-600">
                    Documents received that don&apos;t match any specific request
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-2">
                      {unmatchedDocs.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => onDocumentClick?.(doc.id)}
                          className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded border hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm truncate max-w-[250px]">{doc.fileName}</p>
                              <p className="text-xs text-muted-foreground">{doc.category}</p>
                            </div>
                          </div>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* All Good State */}
            {complianceStats.incompleteRequests === 0 && unmatchedDocs.length === 0 && requests.length > 0 && (
              <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                <CardContent className="flex items-center gap-4 py-6">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-700">All Requests Satisfied!</h3>
                    <p className="text-sm text-green-600">
                      Every discovery request has at least one matching document.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Add Requests Tab */}
        <TabsContent value="add">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Single Request Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Single Request
                </CardTitle>
                <CardDescription>
                  Add individual RFP or Interrogatory items
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={newRequest.type}
                      onValueChange={(v) => setNewRequest({ ...newRequest, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RFP">RFP</SelectItem>
                        <SelectItem value="Interrogatory">Interrogatory</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Number</Label>
                    <Input
                      type="number"
                      value={newRequest.number}
                      onChange={(e) => setNewRequest({ ...newRequest, number: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Request Text</Label>
                  <Textarea
                    placeholder="e.g., All bank statements from January 2023 to present"
                    value={newRequest.text}
                    onChange={(e) => setNewRequest({ ...newRequest, text: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Expected Category (optional)</Label>
                  <Select
                    value={newRequest.categoryHint}
                    onValueChange={(v) => setNewRequest({ ...newRequest, categoryHint: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-detect" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Auto-detect</SelectItem>
                      <SelectItem value="Financial">Financial</SelectItem>
                      <SelectItem value="Medical">Medical</SelectItem>
                      <SelectItem value="Legal">Legal</SelectItem>
                      <SelectItem value="Communications">Communications</SelectItem>
                      <SelectItem value="Property">Property</SelectItem>
                      <SelectItem value="Employment">Employment</SelectItem>
                      <SelectItem value="Personal">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleAddRequest}
                  disabled={adding || !newRequest.text.trim()}
                  className="w-full"
                >
                  {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Request
                </Button>
              </CardContent>
            </Card>

            {/* Bulk Import */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Bulk Import
                </CardTitle>
                <CardDescription>
                  Paste multiple requests at once
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={`Paste your discovery requests here:

RFP 1: All bank statements from January 2023 to present.
RFP 2: All tax returns for the years 2020-2023.
RFP 3: All credit card statements.
Interrogatory 1: State your full legal name and address.`}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <Button
                  onClick={handleImport}
                  disabled={importing || !importText.trim()}
                  className="w-full"
                >
                  {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Import All
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Category Breakdown */}
      {Object.keys(complianceStats.categoryBreakdown).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Compliance by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(complianceStats.categoryBreakdown).map(([category, data]) => {
                const pct = data.requested > 0 ? Math.round((data.found / data.requested) * 100) : 0;
                return (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{category}</span>
                      <span className="text-sm text-muted-foreground">
                        {data.found}/{data.requested} requests satisfied
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
