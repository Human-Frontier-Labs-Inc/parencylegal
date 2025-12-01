/**
 * Usage Dashboard Page
 * Phase 12.5.5: Display AI token usage, costs, and processing statistics
 */
"use client";

import { useState, useEffect } from "react";
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
import { Progress } from "@/components/ui/progress";
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
  ArrowLeft,
  Loader2,
  Zap,
  DollarSign,
  FileText,
  Brain,
  TrendingUp,
  Calendar,
  RefreshCw,
  BarChart3,
  PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UsageStats {
  totalCases: number;
  totalDocuments: number;
  documentsClassified: number;
  documentsNeedingReview: number;
  totalTokensUsed: number;
  estimatedCost: number; // in cents
  averageConfidence: number;
  processingStats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

interface CaseUsage {
  caseId: string;
  caseName: string;
  documentCount: number;
  tokensUsed: number;
  costCents: number;
  lastActivity: string;
}

export default function UsageDashboardPage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [caseUsage, setCaseUsage] = useState<CaseUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "all">("month");

  useEffect(() => {
    fetchUsageData();
  }, [timeframe]);

  const fetchUsageData = async () => {
    setLoading(true);
    try {
      // Fetch cases to calculate usage
      const casesRes = await fetch("/api/cases");
      if (!casesRes.ok) throw new Error("Failed to fetch cases");
      const casesData = await casesRes.json();
      const cases = casesData.cases || [];

      // Calculate overall stats
      let totalDocuments = 0;
      let documentsClassified = 0;
      let documentsNeedingReview = 0;
      let totalTokensUsed = 0;
      let totalConfidence = 0;
      let confidenceCount = 0;
      const usageByCase: CaseUsage[] = [];

      const processingStats = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
      };

      // Fetch documents for each case
      for (const caseItem of cases) {
        try {
          const docsRes = await fetch(`/api/cases/${caseItem.id}/documents`);
          if (docsRes.ok) {
            const docsData = await docsRes.json();
            const documents = docsData.documents || [];

            let caseTokens = 0;
            let caseClassified = 0;

            for (const doc of documents) {
              totalDocuments++;

              if (doc.category) {
                documentsClassified++;
                caseClassified++;
                processingStats.completed++;
              } else if (doc.processingStatus === "failed") {
                processingStats.failed++;
              } else if (doc.processingStatus === "processing") {
                processingStats.processing++;
              } else {
                processingStats.pending++;
              }

              if (doc.needsReview) {
                documentsNeedingReview++;
              }

              if (doc.confidence != null) {
                totalConfidence += doc.confidence;
                confidenceCount++;
              }

              // Estimate tokens per document (classification typically uses ~500-1000 tokens)
              if (doc.category) {
                const estimatedTokens = 750; // Average tokens per classification
                caseTokens += estimatedTokens;
              }
            }

            totalTokensUsed += caseTokens;

            usageByCase.push({
              caseId: caseItem.id,
              caseName: caseItem.name,
              documentCount: documents.length,
              tokensUsed: caseTokens,
              costCents: Math.round(caseTokens * 0.0002), // Rough estimate based on GPT-4 pricing
              lastActivity: caseItem.updatedAt,
            });
          }
        } catch (err) {
          console.error(`Failed to fetch docs for case ${caseItem.id}:`, err);
        }
      }

      // Estimate cost based on token usage
      // GPT-4o-mini pricing: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
      // Average ~$0.20 per 1000 tokens combined
      const estimatedCostCents = Math.round(totalTokensUsed * 0.00002 * 100);

      setStats({
        totalCases: cases.length,
        totalDocuments,
        documentsClassified,
        documentsNeedingReview,
        totalTokensUsed,
        estimatedCost: estimatedCostCents,
        averageConfidence: confidenceCount > 0 ? Math.round(totalConfidence / confidenceCount) : 0,
        processingStats,
      });

      // Sort by activity
      usageByCase.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
      setCaseUsage(usageByCase);
    } catch (error) {
      console.error("Failed to fetch usage data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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

  const classificationRate = stats?.totalDocuments
    ? Math.round((stats.documentsClassified / stats.totalDocuments) * 100)
    : 0;

  return (
    <main className="p-6 md:p-10">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Usage Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            AI token usage, costs, and processing statistics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeframe} onValueChange={(v) => setTimeframe(v as typeof timeframe)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchUsageData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-3xl font-bold">{stats?.totalDocuments || 0}</p>
              </div>
              <FileText className="h-10 w-10 text-blue-500" />
            </div>
            <div className="mt-2">
              <Progress value={classificationRate} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {classificationRate}% classified
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Classifications</p>
                <p className="text-3xl font-bold">{stats?.documentsClassified || 0}</p>
              </div>
              <Brain className="h-10 w-10 text-purple-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Avg. confidence: {stats?.averageConfidence || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tokens Used</p>
                <p className="text-3xl font-bold">{formatTokens(stats?.totalTokensUsed || 0)}</p>
              </div>
              <Zap className="h-10 w-10 text-yellow-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              OpenAI API consumption
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-3xl font-bold">{formatCurrency(stats?.estimatedCost || 0)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on current pricing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Processing Status & Needs Review */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Processing Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Processing Status
            </CardTitle>
            <CardDescription>Document classification pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span>Completed</span>
                </div>
                <span className="font-bold">{stats?.processingStats.completed || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
                  <span>Processing</span>
                </div>
                <span className="font-bold">{stats?.processingStats.processing || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span>Pending</span>
                </div>
                <span className="font-bold">{stats?.processingStats.pending || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span>Failed</span>
                </div>
                <span className="font-bold">{stats?.processingStats.failed || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Review Queue
            </CardTitle>
            <CardDescription>Documents needing human review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-5xl font-bold text-orange-600">
                {stats?.documentsNeedingReview || 0}
              </p>
              <p className="text-muted-foreground mt-2">
                documents flagged for review
              </p>
              {(stats?.documentsNeedingReview || 0) > 0 && (
                <p className="text-sm text-muted-foreground mt-4">
                  Low confidence classifications that need verification
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage by Case */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Usage by Case
          </CardTitle>
          <CardDescription>
            Token usage and costs breakdown by case
          </CardDescription>
        </CardHeader>
        <CardContent>
          {caseUsage.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No cases found. Create a case to start tracking usage.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case Name</TableHead>
                  <TableHead className="text-center">Documents</TableHead>
                  <TableHead className="text-center">Tokens</TableHead>
                  <TableHead className="text-center">Est. Cost</TableHead>
                  <TableHead className="text-right">Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caseUsage.map((item) => (
                  <TableRow key={item.caseId}>
                    <TableCell>
                      <Link
                        href={`/dashboard/cases/${item.caseId}`}
                        className="font-medium hover:underline"
                      >
                        {item.caseName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{item.documentCount}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {formatTokens(item.tokensUsed)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "font-medium",
                        item.costCents > 100 ? "text-orange-600" : "text-green-600"
                      )}>
                        {formatCurrency(item.costCents)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(item.lastActivity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cost Breakdown Info */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <DollarSign className="h-6 w-6 text-muted-foreground flex-shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Cost Estimates</h3>
              <p className="text-sm text-muted-foreground">
                Costs are estimated based on OpenAI GPT-4o-mini pricing (~$0.15/1M input tokens, ~$0.60/1M output tokens).
                Actual costs may vary based on document complexity and the model used.
                For precise billing, check your OpenAI dashboard.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
