/**
 * Bulk Classification Review Page
 * Phase 12.5.2: Review and approve/reject AI classifications in batches
 */
"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Check,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  category: string | null;
  subtype: string | null;
  confidence: number | null;
  needsReview: boolean | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  metadata: {
    summary?: string;
    parties?: string[];
    amounts?: number[];
    startDate?: string;
    endDate?: string;
  } | null;
  createdAt: string;
}

interface Case {
  id: string;
  name: string;
}

// Document categories
const CATEGORIES = [
  "Financial",
  "Medical",
  "Legal",
  "Communications",
  "Property",
  "Employment",
  "Personal",
  "Other",
];

const SUBTYPES: Record<string, string[]> = {
  Financial: [
    "Bank Statement",
    "Pay Stub",
    "Tax Return",
    "Investment Statement",
    "Credit Card Statement",
    "Loan Document",
    "Financial Affidavit",
  ],
  Medical: [
    "Medical Records",
    "Medical Bills",
    "Insurance Claim",
    "Prescription Records",
    "Lab Results",
    "Doctor Notes",
  ],
  Legal: [
    "Court Order",
    "Petition",
    "Motion",
    "Subpoena",
    "Affidavit",
    "Contract",
    "Agreement",
    "Judgment",
  ],
  Communications: ["Email", "Text Messages", "Letter", "Social Media Posts"],
  Property: [
    "Deed",
    "Title",
    "Appraisal",
    "Property Tax Statement",
    "Mortgage Document",
  ],
  Employment: [
    "Employment Contract",
    "W-2",
    "1099",
    "Performance Review",
    "Termination Letter",
  ],
  Personal: [
    "ID Document",
    "Birth Certificate",
    "Marriage Certificate",
    "Divorce Decree",
    "Passport",
  ],
  Other: ["Photograph", "Video", "Audio Recording", "Miscellaneous"],
};

export default function BulkReviewPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Selection and filtering
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("needs_review");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Edit dialog
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editCategory, setEditCategory] = useState("");
  const [editSubtype, setEditSubtype] = useState("");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    needsReview: 0,
    reviewed: 0,
    pending: 0,
  });

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [caseId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch case
      const caseRes = await fetch(`/api/cases/${caseId}`);
      if (caseRes.ok) {
        const caseData = await caseRes.json();
        setCaseData(caseData.case || caseData);
      }

      // Fetch documents
      const docsRes = await fetch(`/api/cases/${caseId}/documents`);
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        const docs = docsData.documents || [];
        setDocuments(docs);

        // Calculate stats
        setStats({
          total: docs.length,
          needsReview: docs.filter((d: Document) => d.needsReview && !d.reviewedAt).length,
          reviewed: docs.filter((d: Document) => d.reviewedAt).length,
          pending: docs.filter((d: Document) => !d.category).length,
        });
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    // Status filter
    if (filterStatus === "needs_review" && (!doc.needsReview || doc.reviewedAt)) {
      return false;
    }
    if (filterStatus === "reviewed" && !doc.reviewedAt) {
      return false;
    }
    if (filterStatus === "pending" && doc.category) {
      return false;
    }

    // Category filter
    if (filterCategory !== "all" && doc.category !== filterCategory) {
      return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / pageSize);
  const paginatedDocuments = filteredDocuments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedDocuments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedDocuments.map((d) => d.id)));
    }
  };

  // Bulk actions
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;

    setProcessing(true);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/documents/${id}/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );

      await Promise.all(promises);
      await fetchData();
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to approve documents:", error);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) return;

    setProcessing(true);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        fetch(`/api/documents/${id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );

      await Promise.all(promises);
      await fetchData();
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to reject documents:", error);
    } finally {
      setProcessing(false);
    }
  };

  // Single document actions
  const handleApprove = async (id: string) => {
    try {
      await fetch(`/api/documents/${id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to approve document:", error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await fetch(`/api/documents/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to reject document:", error);
    }
  };

  // Edit classification
  const openEditDialog = (doc: Document) => {
    setEditingDoc(doc);
    setEditCategory(doc.category || "");
    setEditSubtype(doc.subtype || "");
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;

    try {
      await fetch(`/api/documents/${editingDoc.id}/classification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: editCategory,
          subtype: editSubtype,
        }),
      });

      setEditingDoc(null);
      await fetchData();
    } catch (error) {
      console.error("Failed to update classification:", error);
    }
  };

  // Confidence badge color
  const getConfidenceColor = (confidence: number | null) => {
    if (confidence === null) return "bg-gray-100 text-gray-600";
    if (confidence >= 90) return "bg-green-100 text-green-700";
    if (confidence >= 80) return "bg-blue-100 text-blue-700";
    if (confidence >= 60) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="p-6 md:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/cases/${caseId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Classification Review</h1>
            <p className="text-muted-foreground">
              {caseData?.name || "Loading..."}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Review</p>
                <p className="text-2xl font-bold text-orange-600">{stats.needsReview}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reviewed</p>
                <p className="text-2xl font-bold text-green-600">{stats.reviewed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {stats.total > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Review Progress</span>
              <span className="text-sm text-muted-foreground">
                {stats.reviewed} of {stats.total} reviewed ({Math.round((stats.reviewed / stats.total) * 100)}%)
              </span>
            </div>
            <Progress value={(stats.reviewed / stats.total) * 100} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Filters and Bulk Actions */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Documents</SelectItem>
                  <SelectItem value="needs_review">Needs Review</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="pending">Pending Classification</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkApprove}
                  disabled={processing}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Approve All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkReject}
                  disabled={processing}
                  className="text-red-600 border-red-600 hover:bg-red-50"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 mr-1" />
                  )}
                  Reject All
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedIds.size === paginatedDocuments.length && paginatedDocuments.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Document</TableHead>
                <TableHead>AI Classification</TableHead>
                <TableHead className="w-24 text-center">Confidence</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead className="w-32 text-center">Status</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No documents match your filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedDocuments.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(doc.id)}
                        onCheckedChange={() => toggleSelection(doc.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm truncate max-w-[200px]">
                            {doc.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doc.fileType?.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.category ? (
                        <div>
                          <Badge variant="outline">{doc.category}</Badge>
                          {doc.subtype && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {doc.subtype}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Not classified
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("text-xs", getConfidenceColor(doc.confidence))}>
                        {doc.confidence != null ? `${doc.confidence}%` : "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {doc.metadata?.summary || "No summary available"}
                      </p>
                    </TableCell>
                    <TableCell className="text-center">
                      {doc.reviewedAt ? (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Reviewed
                        </Badge>
                      ) : doc.needsReview ? (
                        <Badge className="bg-orange-100 text-orange-700">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Needs Review
                        </Badge>
                      ) : doc.category ? (
                        <Badge className="bg-blue-100 text-blue-700">
                          Classified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/cases/${caseId}/documents/${doc.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleApprove(doc.id)}
                          disabled={!!doc.reviewedAt}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => openEditDialog(doc)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, filteredDocuments.length)} of{" "}
                {filteredDocuments.length} documents
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Classification Dialog */}
      <Dialog open={!!editingDoc} onOpenChange={() => setEditingDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Classification</DialogTitle>
            <DialogDescription>
              Correct the AI classification for: {editingDoc?.fileName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select value={editCategory} onValueChange={(val) => {
                setEditCategory(val);
                setEditSubtype(""); // Reset subtype when category changes
              }}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editCategory && SUBTYPES[editCategory] && (
              <div>
                <label className="text-sm font-medium">Subtype</label>
                <Select value={editSubtype} onValueChange={setEditSubtype}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select subtype" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBTYPES[editCategory].map((sub) => (
                      <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDoc(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editCategory}>
              Save & Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
