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
} from "lucide-react";

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
  category: string | null;
  subtype: string | null;
  confidence: number | null;
  reviewStatus: string;
  dropboxPath: string | null;
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

const REVIEW_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  needs_review: "bg-orange-100 text-orange-800",
};

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCaseData();
    fetchDocuments();
  }, [caseId]);

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

  const stats = {
    total: documents.length,
    classified: documents.filter((d) => d.category).length,
    needsReview: documents.filter((d) => d.reviewStatus === "needs_review")
      .length,
    accepted: documents.filter((d) => d.reviewStatus === "accepted").length,
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
          <Link href={`/dashboard/cases/${caseId}/settings`}>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

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
                <p className="text-sm text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold">{stats.accepted}</p>
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
                      <TableHead>Confidence</TableHead>
                      <TableHead>Review Status</TableHead>
                      <TableHead>Synced</TableHead>
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
                        <TableCell>
                          {doc.confidence !== null ? (
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    doc.confidence >= 0.8
                                      ? "bg-green-500"
                                      : doc.confidence >= 0.6
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                  }`}
                                  style={{ width: `${doc.confidence * 100}%` }}
                                />
                              </div>
                              <span className="text-sm">
                                {Math.round(doc.confidence * 100)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              REVIEW_STATUS_COLORS[doc.reviewStatus] || ""
                            }
                          >
                            {doc.reviewStatus.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/dashboard/cases/${caseId}/documents/${doc.id}`}
                          >
                            <Button variant="ghost" size="sm">
                              <Eye className="mr-1 h-4 w-4" />
                              Review
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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
    </main>
  );
}
