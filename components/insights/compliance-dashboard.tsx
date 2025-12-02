"use client";

/**
 * Compliance Dashboard
 * Phase 3: Visual dashboard showing RFP compliance status
 *
 * Displays:
 * - Overall compliance score with progress bar
 * - 4-tile stat grid (Complete, Partial, Missing, Extra docs)
 * - Color-coded status indicators
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  FileText,
  Target,
  TrendingUp,
} from "lucide-react";

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

interface ComplianceDashboardProps {
  stats: ComplianceStats;
  isLoading?: boolean;
}

export function ComplianceDashboard({ stats, isLoading = false }: ComplianceDashboardProps) {
  const {
    totalRequests,
    completeRequests,
    partialRequests,
    incompleteRequests,
    overallComplianceScore,
    unmatchedDocuments,
    totalDocuments,
  } = stats;

  // Calculate percentage for display
  const scoreColor =
    overallComplianceScore >= 80
      ? "text-green-600"
      : overallComplianceScore >= 50
        ? "text-yellow-600"
        : "text-red-600";

  const progressColor =
    overallComplianceScore >= 80
      ? "bg-green-500"
      : overallComplianceScore >= 50
        ? "bg-yellow-500"
        : "bg-red-500";

  if (totalRequests === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="p-4 bg-muted rounded-full mb-4">
            <Target className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Requests Analyzed Yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Upload an RFP PDF or paste your discovery requests above to see compliance analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              RFP Compliance Score
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {totalRequests} requests analyzed
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full transition-all duration-500 ${progressColor}`}
                  style={{ width: `${overallComplianceScore}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <span className={`text-4xl font-bold ${scoreColor}`}>
                {overallComplianceScore}%
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {completeRequests} of {totalRequests} requests fully satisfied by your documents
          </p>
        </CardContent>
      </Card>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Complete */}
        <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {completeRequests}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">Complete</p>
              </div>
            </div>
            <p className="text-xs text-green-600/70 mt-2">
              Fully matched requests
            </p>
          </CardContent>
        </Card>

        {/* Partial */}
        <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  {partialRequests}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">Partial</p>
              </div>
            </div>
            <p className="text-xs text-yellow-600/70 mt-2">
              Some docs found
            </p>
          </CardContent>
        </Card>

        {/* Missing */}
        <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {incompleteRequests}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">Missing</p>
              </div>
            </div>
            <p className="text-xs text-red-600/70 mt-2">
              No matching docs
            </p>
          </CardContent>
        </Card>

        {/* Extra Documents */}
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {unmatchedDocuments}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Extra</p>
              </div>
            </div>
            <p className="text-xs text-blue-600/70 mt-2">
              Docs not requested
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Document Coverage Summary */}
      {totalDocuments > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Document Coverage
                </span>
              </div>
              <span className="text-sm font-medium">
                {totalDocuments - unmatchedDocuments} of {totalDocuments} documents matched to requests
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
