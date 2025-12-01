"use client";

/**
 * Professional Document Summary Card
 * Phase 12.2: Document Experience - Structured, professional summary display
 *
 * Shows AI-extracted information in a clean, organized format
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  Calendar,
  Tag,
  Brain,
  CheckCircle,
  AlertCircle,
  Clock,
  DollarSign,
  User,
  Building,
  Hash,
  Info,
} from "lucide-react";

interface ExtractedMetadata {
  documentDate?: string;
  parties?: string[];
  amounts?: string[];
  accountNumbers?: string[];
  addresses?: string[];
  institution?: string;
  period?: string;
  [key: string]: string | string[] | undefined;
}

interface DocumentSummaryCardProps {
  /** Document filename */
  fileName: string;
  /** Document category (e.g., "Financial") */
  category: string | null;
  /** Document subtype (e.g., "Bank Statement") */
  subtype: string | null;
  /** AI confidence score (0-1) */
  confidence: number | null;
  /** AI-generated summary text */
  summary: string | null;
  /** AI reasoning for classification */
  reasoning: string | null;
  /** Extracted metadata from document */
  extractedMetadata?: ExtractedMetadata | null;
  /** Whether document needs review */
  needsReview: boolean | null;
  /** Review status */
  reviewStatus?: string;
  /** Document date */
  documentDate?: string | null;
}

// Category icons mapping
const CATEGORY_ICONS: Record<string, typeof FileText> = {
  Financial: DollarSign,
  Medical: FileText,
  Legal: FileText,
  Communications: FileText,
  Employment: Building,
  Insurance: FileText,
  "Real Estate": Building,
  Government: FileText,
  Personal: User,
  Other: FileText,
};

// Get confidence color and label
function getConfidenceInfo(confidence: number): { color: string; bgColor: string; label: string } {
  if (confidence >= 0.9) {
    return { color: "text-green-700", bgColor: "bg-green-100", label: "High Confidence" };
  } else if (confidence >= 0.7) {
    return { color: "text-yellow-700", bgColor: "bg-yellow-100", label: "Medium Confidence" };
  } else {
    return { color: "text-red-700", bgColor: "bg-red-100", label: "Low Confidence" };
  }
}

export function DocumentSummaryCard({
  fileName,
  category,
  subtype,
  confidence,
  summary,
  reasoning,
  extractedMetadata,
  needsReview,
  reviewStatus,
  documentDate,
}: DocumentSummaryCardProps) {
  const CategoryIcon = category ? CATEGORY_ICONS[category] || FileText : FileText;
  const confidenceInfo = confidence ? getConfidenceInfo(confidence) : null;

  // Parse summary to extract key points if it's a long text
  const summaryPoints = summary?.split(/\n|(?<=[.!?])\s+/).filter(s => s.trim().length > 10).slice(0, 5);

  return (
    <Card className="overflow-hidden">
      {/* Header with category and status */}
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${category ? 'bg-primary/10' : 'bg-muted'}`}>
              <CategoryIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg line-clamp-1">{fileName}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {category && (
                  <Badge variant="secondary" className="font-medium">
                    {category}
                  </Badge>
                )}
                {subtype && (
                  <Badge variant="outline" className="font-normal">
                    {subtype}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex flex-col items-end gap-1">
            {reviewStatus === "accepted" && (
              <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                <CheckCircle className="h-3 w-3 mr-1" />
                Reviewed
              </Badge>
            )}
            {needsReview && reviewStatus !== "accepted" && (
              <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                <AlertCircle className="h-3 w-3 mr-1" />
                Needs Review
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Confidence Score */}
        {confidence !== null && confidenceInfo && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4 text-muted-foreground" />
                AI Confidence
              </span>
              <Badge className={`${confidenceInfo.bgColor} ${confidenceInfo.color}`}>
                {confidenceInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={confidence * 100} className="h-2 flex-1" />
              <span className="text-lg font-bold tabular-nums">
                {Math.round(confidence * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Key Information Section */}
        {(documentDate || extractedMetadata) && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Info className="h-4 w-4" />
                Key Information
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {documentDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <span className="text-muted-foreground">Date:</span>{" "}
                      <span className="font-medium">
                        {new Date(documentDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}

                {extractedMetadata?.institution && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <span className="text-muted-foreground">Institution:</span>{" "}
                      <span className="font-medium">{extractedMetadata.institution}</span>
                    </div>
                  </div>
                )}

                {extractedMetadata?.period && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <span className="text-muted-foreground">Period:</span>{" "}
                      <span className="font-medium">{extractedMetadata.period}</span>
                    </div>
                  </div>
                )}

                {extractedMetadata?.amounts && extractedMetadata.amounts.length > 0 && (
                  <div className="flex items-center gap-2 text-sm col-span-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <span className="text-muted-foreground">Amounts:</span>{" "}
                      <span className="font-medium">
                        {extractedMetadata.amounts.slice(0, 3).join(", ")}
                        {extractedMetadata.amounts.length > 3 && "..."}
                      </span>
                    </div>
                  </div>
                )}

                {extractedMetadata?.parties && extractedMetadata.parties.length > 0 && (
                  <div className="flex items-center gap-2 text-sm col-span-2">
                    <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <span className="text-muted-foreground">Parties:</span>{" "}
                      <span className="font-medium">
                        {extractedMetadata.parties.slice(0, 2).join(", ")}
                        {extractedMetadata.parties.length > 2 && "..."}
                      </span>
                    </div>
                  </div>
                )}

                {extractedMetadata?.accountNumbers && extractedMetadata.accountNumbers.length > 0 && (
                  <div className="flex items-center gap-2 text-sm col-span-2">
                    <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <span className="text-muted-foreground">Account:</span>{" "}
                      <span className="font-medium font-mono">
                        {extractedMetadata.accountNumbers[0]}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Summary Section */}
        {summary && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Summary
              </h4>
              <div className="bg-muted/50 rounded-lg p-3">
                {summaryPoints && summaryPoints.length > 1 ? (
                  <ul className="space-y-1.5 text-sm">
                    {summaryPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{point.trim()}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-relaxed">{summary}</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* AI Reasoning (collapsed by default) */}
        {reasoning && (
          <>
            <Separator />
            <details className="group">
              <summary className="text-sm font-semibold flex items-center gap-2 cursor-pointer list-none">
                <Brain className="h-4 w-4" />
                AI Classification Reasoning
                <span className="text-xs text-muted-foreground ml-auto group-open:hidden">
                  Click to expand
                </span>
              </summary>
              <div className="mt-2 bg-muted/50 rounded-lg p-3">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {reasoning}
                </p>
              </div>
            </details>
          </>
        )}

        {/* No classification state */}
        {!category && !summary && (
          <div className="text-center py-6">
            <Brain className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Not Yet Classified</p>
            <p className="text-xs text-muted-foreground mt-1">
              Run AI classification to extract document information
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
