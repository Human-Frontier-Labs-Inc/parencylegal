"use client";

/**
 * Case Export Page
 * Phase 9: Timeline, Search & Export
 *
 * PDF export by category or discovery request
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  FolderOpen,
  ClipboardList,
  Calendar,
  RefreshCw,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface ExportJob {
  jobId: string;
  type: string;
  status: string;
  progress: number;
  config: any;
  result?: any;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  downloadUrl?: string;
}

interface CaseData {
  id: string;
  name: string;
  categoryCounts: Record<string, number>;
  discoveryRequests: Array<{
    id: string;
    type: string;
    number: number;
    text: string;
  }>;
}

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle,
  failed: AlertCircle,
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-500",
  processing: "text-blue-500",
  completed: "text-green-500",
  failed: "text-red-500",
};

export default function ExportPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Export options
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [includeCoverPage, setIncludeCoverPage] = useState(true);
  const [includeTableOfContents, setIncludeTableOfContents] = useState(true);
  const [groupBy, setGroupBy] = useState<"category" | "date" | "none">("category");
  const [sortBy, setSortBy] = useState<"date" | "category" | "name">("date");

  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [caseId]);

  // Poll for job updates
  useEffect(() => {
    const hasActiveJobs = jobs.some((j) => j.status === "pending" || j.status === "processing");
    if (hasActiveJobs) {
      const interval = setInterval(() => {
        fetchJobs();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [jobs]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch case insights for category counts
      const [insightsRes, discoveryRes, jobsRes] = await Promise.all([
        fetch(`/api/cases/${caseId}/insights`),
        fetch(`/api/cases/${caseId}/discovery`),
        fetch(`/api/cases/${caseId}/export`),
      ]);

      if (insightsRes.ok) {
        const insights = await insightsRes.json();
        const categoryCounts: Record<string, number> = {};
        if (insights.categoryBreakdown) {
          for (const cat of insights.categoryBreakdown) {
            categoryCounts[cat.category] = cat.count;
          }
        }

        let discoveryRequests: any[] = [];
        if (discoveryRes.ok) {
          const discoveryData = await discoveryRes.json();
          discoveryRequests = discoveryData.requests || [];
        }

        setCaseData({
          id: caseId,
          name: insights.caseName || "Case",
          categoryCounts,
          discoveryRequests,
        });
      }

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData.jobs || []);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load export data");
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/export`);
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const toggleRequest = (requestId: string) => {
    setSelectedRequests((prev) =>
      prev.includes(requestId)
        ? prev.filter((r) => r !== requestId)
        : [...prev, requestId]
    );
  };

  const handleExportByCategory = async () => {
    if (selectedCategories.length === 0) return;

    setCreating(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/export/category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categories: selectedCategories,
          options: {
            includeCoverPage,
            includeTableOfContents,
            groupBy,
            sortBy,
          },
        }),
      });

      if (response.ok) {
        setSelectedCategories([]);
        await fetchJobs();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to create export");
      }
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to create export");
    } finally {
      setCreating(false);
    }
  };

  const handleExportByDiscovery = async () => {
    if (selectedRequests.length === 0) return;

    setCreating(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/export/discovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestIds: selectedRequests,
          options: {
            includeCoverPage,
            includeTableOfContents,
            groupBy: "none",
            sortBy,
          },
        }),
      });

      if (response.ok) {
        setSelectedRequests([]);
        await fetchJobs();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to create export");
      }
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to create export");
    } finally {
      setCreating(false);
    }
  };

  const handleExportTimeline = async () => {
    setCreating(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/export/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          options: {
            includeCoverPage,
            includeTableOfContents,
            groupBy: "date",
            sortBy: "date",
          },
        }),
      });

      if (response.ok) {
        await fetchJobs();
      } else {
        const err = await response.json();
        alert(err.error || "Failed to create export");
      }
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to create export");
    } finally {
      setCreating(false);
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

  if (error) {
    return (
      <main className="p-6 md:p-10">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">{error}</h3>
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Download className="h-8 w-8" />
            Export Documents
          </h1>
          <p className="text-muted-foreground mt-1">{caseData?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Options */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="category">
            <TabsList className="mb-4">
              <TabsTrigger value="category">
                <FolderOpen className="mr-2 h-4 w-4" />
                By Category
              </TabsTrigger>
              <TabsTrigger value="discovery">
                <ClipboardList className="mr-2 h-4 w-4" />
                By Discovery Request
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <Calendar className="mr-2 h-4 w-4" />
                Full Timeline
              </TabsTrigger>
            </TabsList>

            {/* Export by Category */}
            <TabsContent value="category">
              <Card>
                <CardHeader>
                  <CardTitle>Export by Category</CardTitle>
                  <CardDescription>
                    Select document categories to include in the export
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(caseData?.categoryCounts || {}).map(([cat, count]) => (
                        <label
                          key={cat}
                          className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedCategories.includes(cat)}
                            onCheckedChange={() => toggleCategory(cat)}
                          />
                          <div className="flex-1">
                            <span className="font-medium">{cat}</span>
                            <span className="text-muted-foreground ml-2">({count})</span>
                          </div>
                        </label>
                      ))}
                    </div>

                    {Object.keys(caseData?.categoryCounts || {}).length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        No categorized documents found. Classify documents first.
                      </p>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t">
                      <span className="text-sm text-muted-foreground">
                        {selectedCategories.length} categor{selectedCategories.length !== 1 ? "ies" : "y"} selected
                      </span>
                      <Button
                        onClick={handleExportByCategory}
                        disabled={creating || selectedCategories.length === 0}
                      >
                        {creating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Create Export
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Export by Discovery Request */}
            <TabsContent value="discovery">
              <Card>
                <CardHeader>
                  <CardTitle>Export by Discovery Request</CardTitle>
                  <CardDescription>
                    Select discovery requests to include their mapped documents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(caseData?.discoveryRequests || []).map((req) => (
                      <label
                        key={req.id}
                        className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedRequests.includes(req.id)}
                          onCheckedChange={() => toggleRequest(req.id)}
                        />
                        <div className="flex-1">
                          <span className="font-mono font-medium">
                            {req.type} {req.number}
                          </span>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {req.text}
                          </p>
                        </div>
                      </label>
                    ))}

                    {(caseData?.discoveryRequests || []).length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        No discovery requests found. Add requests in the Discovery tab.
                      </p>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t">
                      <span className="text-sm text-muted-foreground">
                        {selectedRequests.length} request{selectedRequests.length !== 1 ? "s" : ""} selected
                      </span>
                      <Button
                        onClick={handleExportByDiscovery}
                        disabled={creating || selectedRequests.length === 0}
                      >
                        {creating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Create Export
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Export Timeline */}
            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle>Export Full Timeline</CardTitle>
                  <CardDescription>
                    Export all documents in chronological order
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Chronological Document Export
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Creates a PDF with all documents sorted by date
                    </p>
                    <Button onClick={handleExportTimeline} disabled={creating}>
                      {creating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Create Timeline Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Export Options Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Export Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Include Cover Page</label>
                  <Switch
                    checked={includeCoverPage}
                    onCheckedChange={setIncludeCoverPage}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Include Table of Contents</label>
                  <Switch
                    checked={includeTableOfContents}
                    onCheckedChange={setIncludeTableOfContents}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Group By</label>
                  <Select value={groupBy} onValueChange={(v) => setGroupBy(v as any)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm">Sort By</label>
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Jobs */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Export History</CardTitle>
              <Button variant="ghost" size="sm" onClick={fetchJobs}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No exports yet
                </p>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => {
                    const StatusIcon = STATUS_ICONS[job.status] || Clock;
                    return (
                      <div
                        key={job.jobId}
                        className="p-3 border rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StatusIcon
                              className={`h-4 w-4 ${STATUS_COLORS[job.status]} ${
                                job.status === "processing" ? "animate-spin" : ""
                              }`}
                            />
                            <span className="font-medium capitalize">
                              {job.type} Export
                            </span>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {job.status}
                          </Badge>
                        </div>

                        {(job.status === "pending" || job.status === "processing") && (
                          <Progress value={job.progress} className="h-2" />
                        )}

                        <div className="text-xs text-muted-foreground">
                          {new Date(job.createdAt).toLocaleString()}
                        </div>

                        {job.status === "completed" && job.downloadUrl && (
                          <a
                            href={`/api/cases/${caseId}/export/${job.jobId}/download`}
                            className="block"
                          >
                            <Button size="sm" className="w-full">
                              <Download className="mr-2 h-3 w-3" />
                              Download PDF
                            </Button>
                          </a>
                        )}

                        {job.status === "failed" && job.result?.error && (
                          <p className="text-xs text-destructive">
                            {job.result.error}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
