"use client";

/**
 * Case Insights Panel
 * Phase 7: Case Insights & Gap Detection
 *
 * Displays case analytics, gap detection, and recommendations
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";

interface MissingDocument {
  type: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
  reason: string;
}

interface DateGap {
  type: string;
  category: string;
  missingPeriod: string;
}

interface CaseInsights {
  summary: {
    totalDocuments: number;
    classifiedDocuments: number;
    needsReviewDocuments: number;
    reviewedDocuments: number;
    classificationProgress: number;
    reviewProgress: number;
  };
  quality: {
    averageConfidence: number;
    confidenceDistribution: {
      high: number;
      medium: number;
      low: number;
    };
  };
  categories: Record<string, { count: number; subtypes: Record<string, number> }>;
  gaps: {
    completionScore: number;
    missingDocuments: MissingDocument[];
    dateGaps: DateGap[];
    categoryScores: Record<string, { score: number; found: number; required: number }>;
  };
  recommendations: string[];
  recentDocuments: Array<{
    id: string;
    fileName: string;
    category: string | null;
    subtype: string | null;
    createdAt: string;
  }>;
  needsAttention: Array<{
    id: string;
    fileName: string;
    category: string | null;
    confidence: number | null;
    reason: string;
  }>;
}

interface CaseInsightsPanelProps {
  caseId: string;
  onDocumentClick?: (documentId: string) => void;
}

export function CaseInsightsPanel({ caseId, onDocumentClick }: CaseInsightsPanelProps) {
  const [insights, setInsights] = useState<CaseInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/insights`);
      if (!response.ok) {
        throw new Error("Failed to fetch insights");
      }
      const data = await response.json();
      setInsights(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [caseId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 text-destructive mb-2" />
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchInsights}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!insights) return null;

  const { summary, quality, categories, gaps, recommendations, needsAttention } = insights;

  return (
    <div className="space-y-6">
      {/* Completion Score */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Case Completeness
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchInsights}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={gaps.completionScore} className="h-3" />
            </div>
            <span className="text-2xl font-bold">{gaps.completionScore}%</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Based on required family law documents
          </p>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="text-2xl font-bold">{summary.totalDocuments}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <Progress value={summary.classificationProgress} className="h-1 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {summary.classifiedDocuments} classified
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-2xl font-bold">{quality.averageConfidence}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div className="flex gap-1 mt-2">
              <div
                className="h-1 bg-green-500 rounded"
                style={{
                  width: `${(quality.confidenceDistribution.high / summary.classifiedDocuments) * 100}%`,
                }}
              />
              <div
                className="h-1 bg-yellow-500 rounded"
                style={{
                  width: `${(quality.confidenceDistribution.medium / summary.classifiedDocuments) * 100}%`,
                }}
              />
              <div
                className="h-1 bg-red-500 rounded"
                style={{
                  width: `${(quality.confidenceDistribution.low / summary.classifiedDocuments) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {quality.confidenceDistribution.high} high, {quality.confidenceDistribution.medium}{" "}
              medium, {quality.confidenceDistribution.low} low
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Missing Documents Alert */}
      {gaps.missingDocuments.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <AlertTriangle className="h-5 w-5" />
              Missing Documents ({gaps.missingDocuments.length})
            </CardTitle>
            <CardDescription className="text-orange-600 dark:text-orange-400">
              These documents are typically required for family law cases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {gaps.missingDocuments.slice(0, 5).map((doc, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border"
                  >
                    <div>
                      <p className="font-medium text-sm">{doc.type}</p>
                      <p className="text-xs text-muted-foreground">{doc.description}</p>
                    </div>
                    <Badge
                      variant={doc.priority === "high" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {doc.priority}
                    </Badge>
                  </div>
                ))}
                {gaps.missingDocuments.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    +{gaps.missingDocuments.length - 5} more missing documents
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Date Gaps */}
      {gaps.dateGaps.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
              <Calendar className="h-5 w-5" />
              Date Coverage Gaps ({gaps.dateGaps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gaps.dateGaps.map((gap, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border"
                >
                  <div>
                    <p className="font-medium text-sm">{gap.type}</p>
                    <p className="text-xs text-muted-foreground">Missing: {gap.missingPeriod}</p>
                  </div>
                  <Badge variant="outline">{gap.category}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Document Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(categories).map(([category, data]) => (
              <div key={category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{category}</span>
                  <span className="text-sm text-muted-foreground">{data.count} docs</span>
                </div>
                <Progress
                  value={
                    gaps.categoryScores[category]
                      ? gaps.categoryScores[category].score
                      : 100
                  }
                  className="h-2"
                />
                {Object.keys(data.subtypes).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(data.subtypes)
                      .slice(0, 3)
                      .map(([subtype, count]) => (
                        <Badge key={subtype} variant="secondary" className="text-xs">
                          {subtype}: {count}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
            ))}
            {Object.keys(categories).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No categorized documents yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary" />
                  <p className="text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Needing Attention */}
      {needsAttention.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Needs Review ({needsAttention.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {needsAttention.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onDocumentClick?.(doc.id)}
                  className="w-full flex items-center justify-between p-2 hover:bg-muted rounded transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{doc.fileName}</p>
                      <p className="text-xs text-muted-foreground">{doc.reason}</p>
                    </div>
                  </div>
                  {doc.confidence !== null && (
                    <Badge
                      variant={doc.confidence < 60 ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {doc.confidence}%
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Good State */}
      {gaps.missingDocuments.length === 0 &&
        gaps.dateGaps.length === 0 &&
        needsAttention.length === 0 && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CardContent className="flex items-center gap-4 py-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-700 dark:text-green-300">
                  Looking Good!
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  No critical gaps or issues detected in your case documents.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
