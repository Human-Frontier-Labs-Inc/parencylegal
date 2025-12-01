"use client";

/**
 * Case Export Page
 * Phase 12.4: PDF Export System
 *
 * Allows attorneys to generate court-ready PDF bundles
 * with cover pages, table of contents, and organized documents
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
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  FolderOpen,
  FileOutput,
  ListTree,
  Package,
} from "lucide-react";

interface ExportInfo {
  totalDocuments: number;
  pdfDocuments: number;
  byCategory: Record<string, number>;
  canExport: boolean;
}

interface Case {
  id: string;
  name: string;
  clientName: string | null;
  opposingParty: string | null;
  caseNumber: string | null;
}

export default function ExportPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [exportInfo, setExportInfo] = useState<ExportInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Export options
  const [exportMode, setExportMode] = useState<"by_category" | "by_discovery">(
    "by_category"
  );
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [includeAllCategories, setIncludeAllCategories] = useState(true);

  useEffect(() => {
    fetchCaseAndExportInfo();
  }, [caseId]);

  const fetchCaseAndExportInfo = async () => {
    try {
      // Fetch case data
      const caseResponse = await fetch(`/api/cases/${caseId}`);
      if (caseResponse.ok) {
        const data = await caseResponse.json();
        setCaseData(data);
      }

      // Fetch export info
      const exportResponse = await fetch(`/api/cases/${caseId}/export`);
      if (exportResponse.ok) {
        const info = await exportResponse.json();
        setExportInfo(info);
        // Select all categories by default
        setSelectedCategories(Object.keys(info.byCategory || {}));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    setExportSuccess(false);
    setExportProgress(10);

    try {
      setExportProgress(30);

      const response = await fetch(`/api/cases/${caseId}/export`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          exportMode,
          // Could add category filtering here if needed
        }),
      });

      setExportProgress(70);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      setExportProgress(90);

      // Get the PDF blob
      const blob = await response.blob();
      const pageCount = response.headers.get("X-Page-Count");
      const docCount = response.headers.get("X-Document-Count");

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        response.headers
          .get("Content-Disposition")
          ?.split("filename=")[1]
          ?.replace(/"/g, "") ||
        `${caseData?.name || "Case"}_Export.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportProgress(100);
      setExportSuccess(true);

      // Reset after success
      setTimeout(() => {
        setExportProgress(0);
      }, 2000);
    } catch (error: any) {
      console.error("Export error:", error);
      setExportError(error.message || "Export failed");
      setExportProgress(0);
    } finally {
      setExporting(false);
    }
  };

  const toggleCategory = (category: string) => {
    setIncludeAllCategories(false);
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const selectAllCategories = () => {
    setIncludeAllCategories(true);
    setSelectedCategories(Object.keys(exportInfo?.byCategory || {}));
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

  return (
    <main className="p-6 md:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/dashboard/cases/${caseId}`}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Case
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileOutput className="h-8 w-8" />
          Export Documents
        </h1>
        <p className="text-muted-foreground mt-2">
          Generate a court-ready PDF bundle with cover page and table of contents
        </p>
      </div>

      {/* Case Info Card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{caseData?.name}</CardTitle>
          <CardDescription>
            {caseData?.clientName && caseData?.opposingParty
              ? `${caseData.clientName} v. ${caseData.opposingParty}`
              : caseData?.clientName || ""}
            {caseData?.caseNumber && ` • Case #${caseData.caseNumber}`}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Export Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">
                  {exportInfo?.totalDocuments || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Exportable PDFs</p>
                <p className="text-2xl font-bold">
                  {exportInfo?.pdfDocuments || 0}
                </p>
              </div>
              <Package className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">
                  {Object.keys(exportInfo?.byCategory || {}).length}
                </p>
              </div>
              <FolderOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cannot Export Warning */}
      {!exportInfo?.canExport && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  No PDF documents available
                </p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Only PDF files can be exported. Sync documents from Dropbox or
                  ensure your documents are in PDF format.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Options */}
      {exportInfo?.canExport && (
        <>
          {/* Export Mode */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Export Mode</CardTitle>
              <CardDescription>
                Choose how to organize documents in the export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={exportMode}
                onValueChange={(v) =>
                  setExportMode(v as "by_category" | "by_discovery")
                }
                className="space-y-4"
              >
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="by_category" id="by_category" />
                  <div className="flex-1">
                    <Label
                      htmlFor="by_category"
                      className="font-medium cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <ListTree className="h-4 w-4" />
                        Organize by Category
                      </div>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Documents grouped by type (Financial, Medical, Legal, etc.)
                      with category headers in the table of contents
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors opacity-50">
                  <RadioGroupItem
                    value="by_discovery"
                    id="by_discovery"
                    disabled
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="by_discovery"
                      className="font-medium cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Respond to Discovery Request
                        <Badge variant="outline" className="ml-2">
                          Coming Soon
                        </Badge>
                      </div>
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Export documents matching a specific RFP or Interrogatory
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Category Selection */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Categories to Include</CardTitle>
                  <CardDescription>
                    Select which document categories to export
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllCategories}
                  disabled={includeAllCategories}
                >
                  Select All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(exportInfo?.byCategory || {}).map(
                  ([category, count]) => (
                    <div
                      key={category}
                      className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedCategories.includes(category) || includeAllCategories
                          ? "bg-primary/5 border-primary/30"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleCategory(category)}
                    >
                      <Checkbox
                        checked={
                          selectedCategories.includes(category) || includeAllCategories
                        }
                        onCheckedChange={() => toggleCategory(category)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{category}</p>
                        <p className="text-xs text-muted-foreground">
                          {count} document{count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          {/* Export Preview */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Export Preview</CardTitle>
              <CardDescription>
                What will be included in your export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Cover Page</p>
                    <p className="text-sm text-muted-foreground">
                      Case name, parties, case number, preparation date
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <ListTree className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Table of Contents</p>
                    <p className="text-sm text-muted-foreground">
                      All documents listed with page numbers, organized by category
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {includeAllCategories
                        ? exportInfo?.pdfDocuments
                        : selectedCategories.reduce(
                            (sum, cat) => sum + (exportInfo?.byCategory[cat] || 0),
                            0
                          )}{" "}
                      Documents
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Each with separator page and page numbers
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Progress */}
          {exporting && (
            <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <p className="font-medium text-blue-800 dark:text-blue-200">
                      Generating export...
                    </p>
                  </div>
                  <Progress value={exportProgress} className="h-2" />
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {exportProgress < 30
                      ? "Preparing documents..."
                      : exportProgress < 70
                      ? "Building PDF bundle..."
                      : exportProgress < 100
                      ? "Finalizing export..."
                      : "Complete!"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Error */}
          {exportError && (
            <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-950">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">
                      Export failed
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {exportError}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Success */}
          {exportSuccess && (
            <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-950">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Export complete!
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Your PDF has been downloaded
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Export Button */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/cases/${caseId}`)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={
                exporting ||
                (!includeAllCategories && selectedCategories.length === 0)
              }
              size="lg"
            >
              {exporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Generate Export
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </main>
  );
}
