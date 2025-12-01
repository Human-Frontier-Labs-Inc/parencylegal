"use client";

/**
 * Case Detail Page
 * Shows case information, documents, and Dropbox sync status
 */

import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Folder,
  FileText,
  RefreshCw,
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Check,
  X,
  Sparkles,
  Brain,
  Plus,
  Trash2,
  ClipboardList,
  CircleDot,
  TrendingUp,
  Calendar,
  Search,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { CaseChat } from "@/components/chat/case-chat";
import { CaseInsightsPanel } from "@/components/insights/case-insights-panel";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface Case {
  id: string;
  name: string;
  clientName: string | null;
  opposingParty: string | null;
  caseNumber: string | null;
  status: string;
  dropboxFolderPath: string | null;
  dropboxFolderId: string | null;
  lastSyncedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number | null;
  category: string | null;
  subtype: string | null;
  confidence: number | null; // 0-100 from database
  needsReview: boolean | null;
  reviewedAt: string | null;
  dropboxPath: string | null;
  metadata: {
    summary?: string;
    parties?: string[];
    amounts?: number[];
    startDate?: string;
    endDate?: string;
    [key: string]: any;
  } | null;
  createdAt: string;
}

interface DiscoveryRequest {
  id: string;
  type: string;
  number: number;
  text: string;
  categoryHint: string | null;
  status: 'incomplete' | 'partial' | 'complete';
  completionPercentage: number;
  notes: string | null;
  matchingDocumentCount: number;
  matchingDocumentIds: string[];
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  discovery: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  trial_prep:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  settlement:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const getReviewStatus = (doc: Document): string => {
  if (doc.reviewedAt) return "reviewed";
  if (doc.needsReview) return "needs_review";
  if (doc.category) return "classified";
  return "pending";
};

const REVIEW_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  classified: "bg-blue-100 text-blue-800",
  needs_review: "bg-orange-100 text-orange-800",
  reviewed: "bg-green-100 text-green-800",
};

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<{
    isProcessing: boolean;
    progress: number;
    queue: { pending: number; processing: number; completed: number; failed: number; total: number };
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discoveryRequests, setDiscoveryRequests] = useState<DiscoveryRequest[]>([]);
  const [showAddRfpDialog, setShowAddRfpDialog] = useState(false);
  const [newRfp, setNewRfp] = useState({ type: 'RFP', number: 1, text: '', categoryHint: '' });
  const [addingRfp, setAddingRfp] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedRfp, setSelectedRfp] = useState<DiscoveryRequest | null>(null);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessingDocId, setReprocessingDocId] = useState<string | null>(null);

  useEffect(() => {
    fetchCaseData();
    fetchDocuments();
    fetchProcessingStatus();
    fetchDiscoveryRequests();
  }, [caseId]);

  // Poll for processing status while documents are being analyzed
  useEffect(() => {
    if (processingStatus?.isProcessing) {
      const interval = setInterval(() => {
        fetchProcessingStatus();
        fetchDocuments(); // Refresh documents as they get classified
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [processingStatus?.isProcessing, caseId]);

  const fetchCaseData = async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}`);
      if (response.ok) {
        const data = await response.json();
        setCaseData(data);
      } else if (response.status === 404) {
        setError("Case not found");
      }
    } catch (error) {
      console.error("Failed to fetch case:", error);
      setError("Failed to load case");
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/documents`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  };

  const fetchProcessingStatus = async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/processing-status`);
      if (response.ok) {
        const data = await response.json();
        setProcessingStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch processing status:", error);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      // Process documents immediately (not via queue/cron)
      // This loops until all documents are classified
      let hasMore = true;
      let totalProcessed = 0;
      let totalSuccessful = 0;

      while (hasMore) {
        const response = await fetch(`/api/cases/${caseId}/analyze-documents`, {
          method: "POST",
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("Failed to analyze documents:", error);
          alert(`Analysis failed: ${error.error || 'Unknown error'}`);
          break;
        }

        const data = await response.json();
        totalProcessed += data.processed || 0;
        totalSuccessful += data.successful || 0;
        hasMore = data.hasMore === true;

        // If all documents in this batch failed, show error and stop
        if (data.allFailed) {
          console.error("All documents in batch failed:", data.results);
          alert(`Classification failed for ${data.failed} document(s). Check the console for details.`);
          break;
        }

        // Refresh data after each batch
        await fetchDocuments();
        await fetchProcessingStatus();

        // Small delay to prevent overwhelming the API
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      console.log(`Analysis complete: ${totalSuccessful} of ${totalProcessed} documents classified`);
    } catch (error) {
      console.error("Failed to analyze documents:", error);
      alert("Analysis failed. Check the console for details.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/sync`, {
        method: "POST",
      });
      if (response.ok) {
        await fetchCaseData();
        await fetchDocuments();
      }
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncing(false);
    }
  };

  const fetchDiscoveryRequests = async () => {
    try {
      // Using new Phase 8 API endpoint
      const response = await fetch(`/api/cases/${caseId}/discovery?stats=true`);
      if (response.ok) {
        const data = await response.json();
        setDiscoveryRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Failed to fetch discovery requests:", error);
    }
  };

  const handleAddRfp = async () => {
    if (!newRfp.text.trim()) return;

    setAddingRfp(true);
    try {
      // Using new Phase 8 API endpoint
      const response = await fetch(`/api/cases/${caseId}/discovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRfp),
      });

      if (response.ok) {
        setShowAddRfpDialog(false);
        setNewRfp({ type: 'RFP', number: discoveryRequests.length + 2, text: '', categoryHint: '' });
        await fetchDiscoveryRequests();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add request");
      }
    } catch (error) {
      console.error("Failed to add RFP:", error);
    } finally {
      setAddingRfp(false);
    }
  };

  const handleReprocessAll = async () => {
    if (!confirm(`Reprocess all ${documents.length} documents? This will re-run OCR and classification on all documents.`)) {
      return;
    }

    setReprocessing(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/documents/reprocess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reprocessAll: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Reprocess failed: ${error.error || 'Unknown error'}`);
        return;
      }

      const data = await response.json();
      alert(`Reprocessed ${data.successful} of ${data.total} documents successfully.`);
      await fetchDocuments();
      await fetchProcessingStatus();
    } catch (error) {
      console.error("Reprocess failed:", error);
      alert("Reprocess failed. Check the console for details.");
    } finally {
      setReprocessing(false);
    }
  };

  const handleReprocessDocument = async (documentId: string) => {
    setReprocessingDocId(documentId);
    try {
      const response = await fetch(`/api/cases/${caseId}/documents/reprocess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Reprocess failed: ${error.error || 'Unknown error'}`);
        return;
      }

      const data = await response.json();
      if (data.results[0]?.success) {
        await fetchDocuments();
      } else {
        alert(`Reprocess failed: ${data.results[0]?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Reprocess failed:", error);
      alert("Reprocess failed. Check the console for details.");
    } finally {
      setReprocessingDocId(null);
    }
  };

  const handleDeleteRfp = async (requestId: string) => {
    try {
      // Using new Phase 8 API endpoint
      const response = await fetch(`/api/cases/${caseId}/discovery/${requestId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await fetchDiscoveryRequests();
      }
    } catch (error) {
      console.error("Failed to delete RFP:", error);
    }
  };

  const handleUpdateRfpStatus = async (requestId: string, status: string) => {
    try {
      // Using new Phase 8 API endpoint
      const response = await fetch(`/api/cases/${caseId}/discovery/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (response.ok) {
        await fetchDiscoveryRequests();
      }
    } catch (error) {
      console.error("Failed to update RFP:", error);
    }
  };

  const stats = {
    total: documents.length,
    classified: documents.filter((d) => d.category).length,
    needsReview: documents.filter((d) => d.needsReview).length,
    reviewed: documents.filter((d) => d.reviewedAt).length,
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

  if (error || !caseData) {
    return (
      <main className="p-6 md:p-10">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {error || "Case not found"}
          </h3>
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
            href="/dashboard/cases"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Cases
          </Link>
          <h1 className="text-3xl font-bold">{caseData.name}</h1>
          {caseData.opposingParty && (
            <p className="text-muted-foreground mt-1">
              v. {caseData.opposingParty}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge className={STATUS_COLORS[caseData.status] || ""}>
              {caseData.status.replace("_", " ")}
            </Badge>
            {caseData.caseNumber && (
              <span className="text-sm text-muted-foreground font-mono">
                #{caseData.caseNumber}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {documents.length > 0 && stats.classified < stats.total && (
            <Button
              onClick={handleAnalyze}
              disabled={analyzing || processingStatus?.isProcessing || reprocessing}
            >
              {analyzing || processingStatus?.isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Brain className="mr-2 h-4 w-4" />
              )}
              {processingStatus?.isProcessing
                ? `Analyzing (${processingStatus.queue.completed}/${processingStatus.queue.total})`
                : "Analyze Documents"}
            </Button>
          )}
          {documents.length > 0 && (
            <Button
              variant="outline"
              onClick={handleReprocessAll}
              disabled={reprocessing || analyzing || processingStatus?.isProcessing}
            >
              {reprocessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {reprocessing ? "Reprocessing..." : "Reprocess All"}
            </Button>
          )}
          {caseData.dropboxFolderPath && (
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync Dropbox
            </Button>
          )}
          <Link href={`/dashboard/cases/${caseId}/timeline`}>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Timeline
            </Button>
          </Link>
          <Link href={`/dashboard/cases/${caseId}/search`}>
            <Button variant="outline">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </Link>
          <Link href={`/dashboard/cases/${caseId}/settings`}>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Processing Status Banner */}
      {processingStatus?.isProcessing && (
        <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Brain className="h-6 w-6 text-blue-600 animate-pulse" />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    {processingStatus.message}
                  </span>
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    {processingStatus.progress}%
                  </span>
                </div>
                <Progress value={processingStatus.progress} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Classified</p>
                <p className="text-2xl font-bold">{stats.classified}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Review</p>
                <p className="text-2xl font-bold">{stats.needsReview}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reviewed</p>
                <p className="text-2xl font-bold">{stats.reviewed}</p>
              </div>
              <Check className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Case Info & Documents Tabs */}
      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="insights">
            <span className="flex items-center gap-1">
              Insights
              <TrendingUp className="h-3 w-3" />
            </span>
          </TabsTrigger>
          <TabsTrigger value="discovery">
            Discovery Requests
            {discoveryRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {discoveryRequests.filter(r => r.status === 'incomplete').length} pending
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="chat">
            <span className="flex items-center gap-1">
              AI Chat
              <Sparkles className="h-3 w-3" />
            </span>
          </TabsTrigger>
          <TabsTrigger value="info">Case Info</TabsTrigger>
          <TabsTrigger value="dropbox">Dropbox</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                All documents synced from Dropbox with AI classification
              </CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {caseData.dropboxFolderPath
                      ? "Sync from Dropbox to import documents"
                      : "Connect a Dropbox folder to start importing documents"}
                  </p>
                  {caseData.dropboxFolderPath ? (
                    <Button onClick={handleSync} disabled={syncing}>
                      {syncing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Sync Now
                    </Button>
                  ) : (
                    <Link href={`/dashboard/cases/${caseId}/settings`}>
                      <Button>
                        <Folder className="mr-2 h-4 w-4" />
                        Connect Dropbox
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="max-w-xs">Summary</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{doc.fileName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {doc.category ? (
                            <div>
                              <span className="font-medium">{doc.category}</span>
                              {doc.subtype && (
                                <span className="text-muted-foreground text-sm block">
                                  {doc.subtype}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              Not classified
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {doc.metadata?.summary ? (
                            <button
                              onClick={() => setSelectedDocument(doc)}
                              className="text-left hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
                            >
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {doc.metadata.summary}
                              </p>
                              <span className="text-xs text-blue-600 hover:underline">
                                Click to read more
                              </span>
                            </button>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              {doc.category ? "No summary" : "Pending analysis"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {doc.confidence !== null ? (
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    doc.confidence >= 80
                                      ? "bg-green-500"
                                      : doc.confidence >= 60
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${doc.confidence}%` }}
                                />
                              </div>
                              <span className="text-sm">
                                {doc.confidence}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              REVIEW_STATUS_COLORS[getReviewStatus(doc)] || ""
                            }
                          >
                            {getReviewStatus(doc).replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleReprocessDocument(doc.id)}
                              disabled={reprocessingDocId === doc.id}
                              title="Reprocess with OCR"
                            >
                              {reprocessingDocId === doc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4" />
                              )}
                            </Button>
                            <Link
                              href={`/dashboard/cases/${caseId}/documents/${doc.id}`}
                            >
                              <Button variant="ghost" size="sm">
                                <Eye className="mr-1 h-4 w-4" />
                                Review
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <CaseInsightsPanel
            caseId={caseId}
            onDocumentClick={(docId) => router.push(`/dashboard/cases/${caseId}/documents/${docId}`)}
          />
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Case Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Client Name</p>
                  <p className="font-medium">
                    {caseData.clientName || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Opposing Party</p>
                  <p className="font-medium">
                    {caseData.opposingParty || "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Case Number</p>
                  <p className="font-medium font-mono">
                    {caseData.caseNumber || "Not assigned"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={STATUS_COLORS[caseData.status] || ""}>
                    {caseData.status.replace("_", " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {new Date(caseData.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">
                    {new Date(caseData.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {caseData.notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{caseData.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat">
          <Card>
            <CardContent className="p-0">
              <CaseChat caseId={caseId} caseName={caseData.name} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discovery">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Discovery Requests</CardTitle>
                <CardDescription>
                  Track RFP (Request for Production) items and see what documents match
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/cases/${caseId}/discovery`)}
                >
                  Open Full View
                </Button>
                <Dialog open={showAddRfpDialog} onOpenChange={setShowAddRfpDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Request
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Discovery Request</DialogTitle>
                    <DialogDescription>
                      Add an RFP item to track which documents fulfill this request
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Type</label>
                        <Select
                          value={newRfp.type}
                          onValueChange={(val) => setNewRfp({ ...newRfp, type: val })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="RFP">RFP (Request for Production)</SelectItem>
                            <SelectItem value="Interrogatory">Interrogatory</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Number</label>
                        <Input
                          type="number"
                          value={newRfp.number}
                          onChange={(e) => setNewRfp({ ...newRfp, number: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Request Text</label>
                      <Textarea
                        placeholder="e.g., All bank statements from January 2023 to present"
                        value={newRfp.text}
                        onChange={(e) => setNewRfp({ ...newRfp, text: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Category Hint (optional)</label>
                      <Select
                        value={newRfp.categoryHint}
                        onValueChange={(val) => setNewRfp({ ...newRfp, categoryHint: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
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
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddRfpDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddRfp} disabled={addingRfp || !newRfp.text.trim()}>
                      {addingRfp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Request
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {discoveryRequests.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No discovery requests yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add RFP items to track which documents fulfill each request
                  </p>
                  <Button onClick={() => setShowAddRfpDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Request
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Gap Analysis Summary */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card className="bg-green-50 dark:bg-green-950 border-green-200">
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-green-700">
                          {discoveryRequests.filter(r => r.matchingDocumentCount > 0).length}
                        </div>
                        <div className="text-sm text-green-600">Requests with matches</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200">
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-yellow-700">
                          {discoveryRequests.filter(r => r.status === 'partial').length}
                        </div>
                        <div className="text-sm text-yellow-600">Partially fulfilled</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-red-50 dark:bg-red-950 border-red-200">
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-red-700">
                          {discoveryRequests.filter(r => r.matchingDocumentCount === 0).length}
                        </div>
                        <div className="text-sm text-red-600">Missing documents</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Request List */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Request</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-32">Matches</TableHead>
                        <TableHead className="w-32">Status</TableHead>
                        <TableHead className="w-20 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {discoveryRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-mono font-medium">
                            {req.type} {req.number}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-md">
                              <p className="line-clamp-2">{req.text}</p>
                              {req.categoryHint && (
                                <Badge variant="outline" className="mt-1">
                                  {req.categoryHint}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => setSelectedRfp(req)}
                              className="hover:bg-muted/50 rounded p-1 -m-1 transition-colors"
                            >
                              {req.matchingDocumentCount > 0 ? (
                                <div className="flex items-center text-green-600">
                                  <CheckCircle className="mr-1 h-4 w-4" />
                                  <span className="hover:underline">
                                    {req.matchingDocumentCount} doc{req.matchingDocumentCount !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center text-red-600">
                                  <AlertCircle className="mr-1 h-4 w-4" />
                                  <span className="hover:underline">No matches</span>
                                </div>
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={req.status}
                              onValueChange={(val) => handleUpdateRfpStatus(req.id, val)}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="incomplete">
                                  <div className="flex items-center">
                                    <CircleDot className="mr-1 h-3 w-3 text-red-500" />
                                    Incomplete
                                  </div>
                                </SelectItem>
                                <SelectItem value="partial">
                                  <div className="flex items-center">
                                    <CircleDot className="mr-1 h-3 w-3 text-yellow-500" />
                                    Partial
                                  </div>
                                </SelectItem>
                                <SelectItem value="complete">
                                  <div className="flex items-center">
                                    <CheckCircle className="mr-1 h-3 w-3 text-green-500" />
                                    Complete
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRfp(req.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dropbox">
          <Card>
            <CardHeader>
              <CardTitle>Dropbox Integration</CardTitle>
              <CardDescription>
                Manage your Dropbox folder connection for this case
              </CardDescription>
            </CardHeader>
            <CardContent>
              {caseData.dropboxFolderPath ? (
                <div className="space-y-4">
                  <div className="flex items-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium">Dropbox Connected</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {caseData.dropboxFolderPath}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Last Synced</p>
                      <p className="font-medium">
                        {caseData.lastSyncedAt
                          ? new Date(caseData.lastSyncedAt).toLocaleString()
                          : "Never"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Documents Synced
                      </p>
                      <p className="font-medium">{documents.length}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSync} disabled={syncing}>
                      {syncing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Sync Now
                    </Button>
                    <Link href={`/dashboard/cases/${caseId}/settings`}>
                      <Button variant="outline">Change Folder</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Dropbox folder connected
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Connect a Dropbox folder to automatically sync documents
                  </p>
                  <Link href={`/dashboard/cases/${caseId}/settings`}>
                    <Button>
                      <Folder className="mr-2 h-4 w-4" />
                      Connect Dropbox Folder
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Summary Dialog */}
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedDocument?.fileName}
            </DialogTitle>
            <DialogDescription>
              {selectedDocument?.category && (
                <Badge className="mr-2">{selectedDocument.category}</Badge>
              )}
              {selectedDocument?.subtype && (
                <Badge variant="outline">{selectedDocument.subtype}</Badge>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <h4 className="font-medium mb-2">AI Summary</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {selectedDocument?.metadata?.summary || "No summary available"}
              </p>
            </div>
            {selectedDocument?.metadata?.parties && selectedDocument.metadata.parties.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Parties Mentioned</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDocument.metadata.parties.map((party, i) => (
                    <Badge key={i} variant="secondary">{party}</Badge>
                  ))}
                </div>
              </div>
            )}
            {selectedDocument?.metadata?.amounts && selectedDocument.metadata.amounts.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Amounts Found</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedDocument.metadata.amounts.map((amount, i) => (
                    <Badge key={i} variant="outline">
                      ${amount.toLocaleString()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {(selectedDocument?.metadata?.startDate || selectedDocument?.metadata?.endDate) && (
              <div>
                <h4 className="font-medium mb-2">Date Range</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedDocument.metadata.startDate && `From: ${selectedDocument.metadata.startDate}`}
                  {selectedDocument.metadata.startDate && selectedDocument.metadata.endDate && " — "}
                  {selectedDocument.metadata.endDate && `To: ${selectedDocument.metadata.endDate}`}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Link href={`/dashboard/cases/${caseId}/documents/${selectedDocument?.id}`}>
              <Button>
                <Eye className="mr-2 h-4 w-4" />
                View Full Document
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RFP Matching Documents Dialog */}
      <Dialog open={!!selectedRfp} onOpenChange={() => setSelectedRfp(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRfp?.type} {selectedRfp?.number} - Matching Documents
            </DialogTitle>
            <DialogDescription>
              {selectedRfp?.text}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedRfp?.matchingDocumentCount === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No matching documents</h3>
                <p className="text-muted-foreground">
                  No documents in this case match the category "{selectedRfp?.categoryHint || 'unspecified'}"
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents
                  .filter(doc => selectedRfp?.matchingDocumentIds?.includes(doc.id))
                  .map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.fileName}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {doc.metadata?.summary || doc.subtype || doc.category}
                          </p>
                        </div>
                      </div>
                      <Link href={`/dashboard/cases/${caseId}/documents/${doc.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
