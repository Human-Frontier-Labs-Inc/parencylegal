"use client";

/**
 * Discovery Request Tracking Page
 * Phase 8: Discovery Request Tracking
 *
 * Manage RFPs, Interrogatories, and document mappings
 */

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  FileText,
  Upload,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Trash2,
  Edit,
  ChevronRight,
  FileCheck,
  FileX,
} from "lucide-react";

interface DiscoveryRequest {
  id: string;
  type: "RFP" | "Interrogatory";
  number: number;
  text: string;
  categoryHint: string | null;
  status: "incomplete" | "complete" | "partial";
  completionPercentage: number;
  notes: string | null;
  createdAt: string;
}

interface DiscoveryStats {
  total: number;
  rfpCount: number;
  interrogatoryCount: number;
  complete: number;
  partial: number;
  incomplete: number;
  averageCompletion: number;
}

interface DocumentMapping {
  id: string;
  documentId: string;
  source: "ai_suggestion" | "manual_addition";
  confidence: number | null;
  reasoning: string | null;
  status: "suggested" | "accepted" | "rejected";
  document?: {
    id: string;
    fileName: string;
    category: string | null;
    subtype: string | null;
  };
}

export default function DiscoveryPage() {
  const params = useParams();
  const caseId = params.id as string;
  const router = useRouter();

  const [requests, setRequests] = useState<DiscoveryRequest[]>([]);
  const [stats, setStats] = useState<DiscoveryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<"RFP" | "Interrogatory">("RFP");
  const [createNumber, setCreateNumber] = useState("");
  const [createText, setCreateText] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [creating, setCreating] = useState(false);

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    failed: number;
    errors: Array<{ line: number; error: string }>;
  } | null>(null);

  // Selected request for detail view
  const [selectedRequest, setSelectedRequest] = useState<DiscoveryRequest | null>(null);
  const [mappings, setMappings] = useState<DocumentMapping[]>([]);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [suggestingDocs, setSuggestingDocs] = useState(false);

  const fetchRequests = async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/discovery?stats=true`);
      if (!response.ok) throw new Error("Failed to fetch discovery requests");
      const data = await response.json();
      setRequests(data.requests || []);
      setStats(data.stats || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMappings = async (requestId: string) => {
    setLoadingMappings(true);
    try {
      const response = await fetch(
        `/api/cases/${caseId}/discovery/${requestId}/mappings?includeDocuments=true`
      );
      if (!response.ok) throw new Error("Failed to fetch mappings");
      const data = await response.json();
      setMappings(data.mappings || []);
    } catch (err: any) {
      console.error("Failed to fetch mappings:", err);
    } finally {
      setLoadingMappings(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [caseId]);

  useEffect(() => {
    if (selectedRequest) {
      fetchMappings(selectedRequest.id);
    }
  }, [selectedRequest?.id]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/discovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: createType,
          number: parseInt(createNumber, 10),
          text: createText,
          notes: createNotes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create request");
      }

      setCreateDialogOpen(false);
      setCreateNumber("");
      setCreateText("");
      setCreateNotes("");
      fetchRequests();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setImportResult(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/discovery/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: importText }),
      });

      const data = await response.json();
      setImportResult({
        imported: data.imported || 0,
        failed: data.failed || 0,
        errors: data.errors || [],
      });

      if (data.imported > 0) {
        fetchRequests();
      }
    } catch (err: any) {
      setImportResult({
        imported: 0,
        failed: 1,
        errors: [{ line: 0, error: err.message }],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleSuggestDocuments = async () => {
    if (!selectedRequest) return;

    setSuggestingDocs(true);
    try {
      const response = await fetch(
        `/api/cases/${caseId}/discovery/${selectedRequest.id}/suggest`,
        { method: "POST" }
      );

      if (!response.ok) throw new Error("Failed to generate suggestions");

      fetchMappings(selectedRequest.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSuggestingDocs(false);
    }
  };

  const handleMappingAction = async (
    mappingId: string,
    action: "accepted" | "rejected"
  ) => {
    if (!selectedRequest) return;

    try {
      const response = await fetch(
        `/api/cases/${caseId}/discovery/${selectedRequest.id}/mappings/${mappingId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action }),
        }
      );

      if (!response.ok) throw new Error("Failed to update mapping");

      fetchMappings(selectedRequest.id);
      fetchRequests(); // Refresh stats
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to delete this discovery request?")) return;

    try {
      const response = await fetch(
        `/api/cases/${caseId}/discovery/${requestId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete request");

      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null);
      }
      fetchRequests();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "partial":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge className="bg-green-100 text-green-700">Complete</Badge>;
      case "partial":
        return <Badge className="bg-yellow-100 text-yellow-700">Partial</Badge>;
      default:
        return <Badge variant="secondary">Incomplete</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/dashboard/cases/${caseId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Discovery Tracking</h1>
            <p className="text-muted-foreground">
              Manage RFPs and Interrogatories
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Import Discovery Requests</DialogTitle>
                <DialogDescription>
                  Paste your RFPs or Interrogatories. Each request should start with
                  &quot;RFP #:&quot; or &quot;Interrogatory #:&quot;
                </DialogDescription>
              </DialogHeader>
              <Textarea
                placeholder={`RFP 1: All bank statements from January 2023 to present.
RFP 2: All tax returns for the years 2020-2023.
Interrogatory 1: State your full legal name and address.`}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              {importResult && (
                <div
                  className={`p-3 rounded ${
                    importResult.imported > 0
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  <p>
                    Imported: {importResult.imported} | Failed: {importResult.failed}
                  </p>
                  {importResult.errors.length > 0 && (
                    <ul className="mt-2 text-sm">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>
                          Line {err.line}: {err.error}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={importing || !importText.trim()}>
                  {importing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Discovery Request</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={createType}
                      onValueChange={(v) => setCreateType(v as "RFP" | "Interrogatory")}
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
                      min="1"
                      value={createNumber}
                      onChange={(e) => setCreateNumber(e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Request Text</Label>
                  <Textarea
                    value={createText}
                    onChange={(e) => setCreateText(e.target.value)}
                    placeholder="All documents relating to..."
                    className="min-h-[100px]"
                  />
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Input
                    value={createNotes}
                    onChange={(e) => setCreateNotes(e.target.value)}
                    placeholder="Internal notes..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !createNumber || !createText.trim()}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">{stats.rfpCount} RFPs</Badge>
                <Badge variant="outline">{stats.interrogatoryCount} Interrog.</Badge>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.complete}</div>
              <p className="text-sm text-muted-foreground">Complete</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.partial}</div>
              <p className="text-sm text-muted-foreground">Partial</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.averageCompletion}%</div>
              <p className="text-sm text-muted-foreground">Avg. Completion</p>
              <Progress value={stats.averageCompletion} className="h-1 mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Request List */}
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Discovery Requests</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {requests.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No discovery requests yet</p>
                  <p className="text-sm">Create one or import from text</p>
                </div>
              ) : (
                <div className="divide-y">
                  {requests.map((request) => (
                    <button
                      key={request.id}
                      onClick={() => setSelectedRequest(request)}
                      className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                        selectedRequest?.id === request.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(request.status)}
                          <span className="font-medium">
                            {request.type} {request.number}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {request.text}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {request.categoryHint && (
                          <Badge variant="secondary" className="text-xs">
                            {request.categoryHint}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {request.completionPercentage}%
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Request Detail */}
        <Card className="col-span-2">
          {selectedRequest ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {selectedRequest.type} {selectedRequest.number}
                      {getStatusBadge(selectedRequest.status)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {selectedRequest.categoryHint && (
                        <Badge variant="outline" className="mr-2">
                          {selectedRequest.categoryHint}
                        </Badge>
                      )}
                      {selectedRequest.completionPercentage}% complete
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRequest(selectedRequest.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Request Text */}
                  <div>
                    <h4 className="font-medium mb-2">Request Text</h4>
                    <p className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                      {selectedRequest.text}
                    </p>
                  </div>

                  {/* Document Mappings */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Mapped Documents</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSuggestDocuments}
                        disabled={suggestingDocs}
                      >
                        {suggestingDocs ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        AI Suggest
                      </Button>
                    </div>

                    {loadingMappings ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : mappings.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No documents mapped yet</p>
                        <p className="text-sm">
                          Click &quot;AI Suggest&quot; to find matching documents
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mappings.map((mapping) => (
                          <div
                            key={mapping.id}
                            className={`flex items-center justify-between p-3 rounded border ${
                              mapping.status === "suggested"
                                ? "bg-blue-50 border-blue-200"
                                : mapping.status === "accepted"
                                ? "bg-green-50 border-green-200"
                                : "bg-gray-50 border-gray-200 opacity-50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">
                                  {mapping.document?.fileName || "Unknown Document"}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  {mapping.document?.category && (
                                    <span>{mapping.document.category}</span>
                                  )}
                                  {mapping.confidence && (
                                    <Badge variant="outline" className="text-xs">
                                      {mapping.confidence}% match
                                    </Badge>
                                  )}
                                  {mapping.source === "ai_suggestion" && (
                                    <Badge variant="secondary" className="text-xs">
                                      AI
                                    </Badge>
                                  )}
                                </div>
                                {mapping.reasoning && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {mapping.reasoning}
                                  </p>
                                )}
                              </div>
                            </div>
                            {mapping.status === "suggested" && (
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-100"
                                  onClick={() =>
                                    handleMappingAction(mapping.id, "accepted")
                                  }
                                >
                                  <FileCheck className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-100"
                                  onClick={() =>
                                    handleMappingAction(mapping.id, "rejected")
                                  }
                                >
                                  <FileX className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                            {mapping.status === "accepted" && (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[600px]">
              <div className="text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Select a discovery request to view details</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
