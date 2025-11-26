"use client";

/**
 * Document Viewer Page
 * Shows document details, AI classification, and review actions
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowLeft,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  History,
  Edit,
  Brain,
} from "lucide-react";

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: string | null;
  subtype: string | null;
  confidence: number | null;
  aiReasoning: string | null;
  reviewStatus: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  dropboxPath: string | null;
  caseId: string;
  createdAt: string;
  updatedAt: string;
}

interface ClassificationHistory {
  id: string;
  category: string;
  subtype: string;
  confidence: number;
  action: string;
  reason: string | null;
  createdAt: string;
}

const CATEGORIES = [
  "Financial",
  "Medical",
  "Legal",
  "Communications",
  "Employment",
  "Insurance",
  "Real Estate",
  "Government",
  "Personal",
  "Other",
];

const SUBTYPES: Record<string, string[]> = {
  Financial: ["Bank Statement", "Tax Return", "Invoice", "Receipt", "Contract"],
  Medical: ["Medical Record", "Lab Report", "Prescription", "Insurance Claim"],
  Legal: ["Contract", "Court Filing", "Legal Brief", "Affidavit", "Deposition"],
  Communications: ["Email", "Letter", "Memo", "Text Message", "Voicemail"],
  Employment: ["Resume", "Offer Letter", "Performance Review", "Pay Stub"],
  Insurance: ["Policy", "Claim", "Denial Letter", "Settlement"],
  "Real Estate": ["Deed", "Lease", "Appraisal", "Inspection Report"],
  Government: ["License", "Permit", "Regulatory Filing", "Tax Notice"],
  Personal: ["Photo", "Video", "Personal Note", "Identification"],
  Other: ["Miscellaneous", "Unclassified"],
};

const REVIEW_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  needs_review: "bg-orange-100 text-orange-800",
};

export default function DocumentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;
  const docId = params.docId as string;

  const [document, setDocument] = useState<Document | null>(null);
  const [history, setHistory] = useState<ClassificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Override state
  const [showOverride, setShowOverride] = useState(false);
  const [overrideCategory, setOverrideCategory] = useState("");
  const [overrideSubtype, setOverrideSubtype] = useState("");
  const [overriding, setOverriding] = useState(false);

  // Reject state
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchDocument();
    fetchHistory();
  }, [docId]);

  const fetchDocument = async () => {
    try {
      const response = await fetch(`/api/documents/${docId}`);
      if (response.ok) {
        const data = await response.json();
        setDocument(data);
      } else if (response.status === 404) {
        setError("Document not found");
      }
    } catch (error) {
      console.error("Failed to fetch document:", error);
      setError("Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/documents/${docId}/classification-history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  };

  const handleClassify = async () => {
    setClassifying(true);
    try {
      const response = await fetch(`/api/documents/${docId}/classify`, {
        method: "POST",
      });
      if (response.ok) {
        await fetchDocument();
        await fetchHistory();
      }
    } catch (error) {
      console.error("Classification failed:", error);
    } finally {
      setClassifying(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const response = await fetch(`/api/documents/${docId}/accept`, {
        method: "POST",
      });
      if (response.ok) {
        await fetchDocument();
        await fetchHistory();
      }
    } catch (error) {
      console.error("Accept failed:", error);
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    try {
      const response = await fetch(`/api/documents/${docId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (response.ok) {
        setShowReject(false);
        setRejectReason("");
        await fetchDocument();
        await fetchHistory();
      }
    } catch (error) {
      console.error("Reject failed:", error);
    } finally {
      setRejecting(false);
    }
  };

  const handleOverride = async () => {
    if (!overrideCategory) return;
    setOverriding(true);
    try {
      const response = await fetch(`/api/documents/${docId}/classification`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: overrideCategory,
          subtype: overrideSubtype,
        }),
      });
      if (response.ok) {
        setShowOverride(false);
        setOverrideCategory("");
        setOverrideSubtype("");
        await fetchDocument();
        await fetchHistory();
      }
    } catch (error) {
      console.error("Override failed:", error);
    } finally {
      setOverriding(false);
    }
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

  if (error || !document) {
    return (
      <main className="p-6 md:p-10">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {error || "Document not found"}
          </h3>
          <Link href={`/dashboard/cases/${caseId}`}>
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Case
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
          <h1 className="text-2xl font-bold flex items-center">
            <FileText className="mr-2 h-6 w-6" />
            {document.fileName}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              className={REVIEW_STATUS_COLORS[document.reviewStatus] || ""}
            >
              {document.reviewStatus.replace("_", " ")}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {(document.fileSize / 1024).toFixed(1)} KB
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleClassify}
            disabled={classifying}
          >
            {classifying ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Brain className="mr-2 h-4 w-4" />
            )}
            Re-classify
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Classification */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="mr-2 h-5 w-5" />
                AI Classification
              </CardTitle>
              <CardDescription>
                Classification determined by AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {document.category ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="text-lg font-semibold">{document.category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Subtype</p>
                      <p className="text-lg font-semibold">
                        {document.subtype || "Not specified"}
                      </p>
                    </div>
                  </div>

                  {document.confidence !== null && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Confidence Score
                      </p>
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-3 mr-3">
                          <div
                            className={`h-3 rounded-full ${
                              document.confidence >= 0.8
                                ? "bg-green-500"
                                : document.confidence >= 0.6
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${document.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-lg font-semibold">
                          {Math.round(document.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {document.aiReasoning && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        AI Reasoning
                      </p>
                      <p className="text-sm bg-muted p-3 rounded-lg">
                        {document.aiReasoning}
                      </p>
                    </div>
                  )}

                  {/* Review Actions */}
                  {document.reviewStatus !== "accepted" && (
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        onClick={handleAccept}
                        disabled={accepting}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {accepting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="mr-2 h-4 w-4" />
                        )}
                        Accept Classification
                      </Button>

                      <Dialog open={showReject} onOpenChange={setShowReject}>
                        <DialogTrigger asChild>
                          <Button variant="destructive">
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reject Classification</DialogTitle>
                            <DialogDescription>
                              Please provide a reason for rejecting this
                              classification.
                            </DialogDescription>
                          </DialogHeader>
                          <Textarea
                            placeholder="Enter reason for rejection..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={3}
                          />
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setShowReject(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleReject}
                              disabled={rejecting || !rejectReason.trim()}
                            >
                              {rejecting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              Reject
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={showOverride} onOpenChange={setShowOverride}>
                        <DialogTrigger asChild>
                          <Button variant="outline">
                            <Edit className="mr-2 h-4 w-4" />
                            Override
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Override Classification</DialogTitle>
                            <DialogDescription>
                              Manually set the category and subtype for this
                              document.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">
                                Category
                              </label>
                              <Select
                                value={overrideCategory}
                                onValueChange={(v) => {
                                  setOverrideCategory(v);
                                  setOverrideSubtype("");
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {CATEGORIES.map((cat) => (
                                    <SelectItem key={cat} value={cat}>
                                      {cat}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {overrideCategory && (
                              <div>
                                <label className="text-sm font-medium">
                                  Subtype
                                </label>
                                <Select
                                  value={overrideSubtype}
                                  onValueChange={setOverrideSubtype}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select subtype" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SUBTYPES[overrideCategory]?.map((sub) => (
                                      <SelectItem key={sub} value={sub}>
                                        {sub}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setShowOverride(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleOverride}
                              disabled={overriding || !overrideCategory}
                            >
                              {overriding ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : null}
                              Save Override
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}

                  {document.reviewStatus === "accepted" && (
                    <div className="flex items-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                      <div>
                        <p className="font-medium">Classification Accepted</p>
                        {document.reviewedAt && (
                          <p className="text-sm text-muted-foreground">
                            Reviewed on{" "}
                            {new Date(document.reviewedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Not yet classified
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Run AI classification to automatically categorize this
                    document
                  </p>
                  <Button onClick={handleClassify} disabled={classifying}>
                    {classifying ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Brain className="mr-2 h-4 w-4" />
                    )}
                    Classify Document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Document Info */}
          <Card>
            <CardHeader>
              <CardTitle>Document Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">File Type</p>
                <p className="font-medium">{document.fileType.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">File Size</p>
                <p className="font-medium">
                  {(document.fileSize / 1024).toFixed(1)} KB
                </p>
              </div>
              {document.dropboxPath && (
                <div>
                  <p className="text-sm text-muted-foreground">Dropbox Path</p>
                  <p className="font-medium text-sm font-mono break-all">
                    {document.dropboxPath}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Synced</p>
                <p className="font-medium">
                  {new Date(document.createdAt).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Classification History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="mr-2 h-5 w-5" />
                History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No classification history
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className="text-sm border-l-2 border-muted pl-3"
                    >
                      <p className="font-medium">
                        {item.action === "classified"
                          ? "AI Classified"
                          : item.action === "accepted"
                          ? "Accepted"
                          : item.action === "rejected"
                          ? "Rejected"
                          : "Override"}
                      </p>
                      <p className="text-muted-foreground">
                        {item.category}
                        {item.subtype && ` / ${item.subtype}`}
                      </p>
                      {item.reason && (
                        <p className="text-muted-foreground italic">
                          "{item.reason}"
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
