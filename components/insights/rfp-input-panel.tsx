"use client";

/**
 * RFP Input Panel
 * Phase 1: Core input interface for uploading PDF or pasting RFP text
 *
 * Provides two methods for inputting discovery requests:
 * 1. Upload a PDF file containing RFPs/Interrogatories
 * 2. Copy/paste request text directly
 */

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  ClipboardPaste,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
  FileUp,
} from "lucide-react";

interface ParsedRequest {
  type: "RFP" | "Interrogatory";
  number: number;
  text: string;
  suggestedCategory: string | null;
  confidence: number;
}

interface ParseResult {
  requests: ParsedRequest[];
  metadata: {
    totalExtracted: number;
    documentTitle?: string;
    parseConfidence: number;
  };
}

interface RfpInputPanelProps {
  caseId: string;
  onRequestsParsed: (result: ParseResult) => void;
  onAnalyzeExisting?: () => void;
  existingRequestCount?: number;
}

export function RfpInputPanel({
  caseId,
  onRequestsParsed,
  onAnalyzeExisting,
  existingRequestCount = 0,
}: RfpInputPanelProps) {
  // State
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf") {
        setUploadedFile(file);
      } else {
        setError("Please upload a PDF file");
      }
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf") {
        setUploadedFile(file);
      } else {
        setError("Please upload a PDF file");
      }
    }
  };

  // Process PDF upload
  const handleProcessPdf = async () => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setProcessingProgress(10);
    setProcessingMessage("Uploading PDF...");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      setProcessingProgress(30);
      setProcessingMessage("Extracting text from PDF...");

      const response = await fetch(`/api/cases/${caseId}/discovery/parse-pdf`, {
        method: "POST",
        body: formData,
      });

      setProcessingProgress(70);
      setProcessingMessage("Identifying requests...");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to parse PDF");
      }

      const result: ParseResult = await response.json();

      setProcessingProgress(100);
      setProcessingMessage(`Found ${result.metadata.totalExtracted} requests!`);

      // Short delay to show success message
      await new Promise((resolve) => setTimeout(resolve, 500));

      onRequestsParsed(result);
      setUploadedFile(null);
    } catch (err: any) {
      setError(err.message || "Failed to process PDF");
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingMessage("");
    }
  };

  // Process pasted text
  const handleProcessText = async () => {
    if (!pastedText.trim()) return;

    setIsProcessing(true);
    setProcessingProgress(20);
    setProcessingMessage("Analyzing text...");
    setError(null);

    try {
      setProcessingProgress(50);
      setProcessingMessage("Identifying requests...");

      const response = await fetch(`/api/cases/${caseId}/discovery/parse-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pastedText }),
      });

      setProcessingProgress(80);
      setProcessingMessage("Processing requests...");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to parse text");
      }

      const result: ParseResult = await response.json();

      setProcessingProgress(100);
      setProcessingMessage(`Found ${result.metadata.totalExtracted} requests!`);

      await new Promise((resolve) => setTimeout(resolve, 500));

      onRequestsParsed(result);
      setPastedText("");
    } catch (err: any) {
      setError(err.message || "Failed to process text");
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingMessage("");
    }
  };

  // Clear uploaded file
  const handleClearFile = () => {
    setUploadedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          RFP Compliance Analysis
        </CardTitle>
        <CardDescription>
          Upload your RFP/Interrogatory document or paste the requests to see how your documents match
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Tab Selector */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "upload" ? "default" : "outline"}
            onClick={() => setActiveTab("upload")}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload PDF
          </Button>
          <Button
            variant={activeTab === "paste" ? "default" : "outline"}
            onClick={() => setActiveTab("paste")}
            className="flex-1"
          >
            <ClipboardPaste className="h-4 w-4 mr-2" />
            Paste Text
          </Button>
        </div>

        {/* Processing State */}
        {isProcessing && (
          <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium">{processingMessage}</span>
            </div>
            <Progress value={processingProgress} className="h-2" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 rounded-lg border border-destructive/20 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Upload PDF Tab */}
        {activeTab === "upload" && !isProcessing && (
          <div className="space-y-4">
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
                ${isDragging
                  ? "border-primary bg-primary/5"
                  : uploadedFile
                    ? "border-green-500 bg-green-50 dark:bg-green-950"
                    : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {uploadedFile ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-300">
                      {uploadedFile.name}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {(uploadedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearFile();
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-muted rounded-full">
                    <FileUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Drop your RFP PDF here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Analyze Button */}
            {uploadedFile && (
              <Button
                onClick={handleProcessPdf}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze PDF for Requests
              </Button>
            )}
          </div>
        )}

        {/* Paste Text Tab */}
        {activeTab === "paste" && !isProcessing && (
          <div className="space-y-4">
            <Textarea
              placeholder={`Paste your RFP or Interrogatory requests here...

Example:
RFP 1: All bank statements from January 2023 to present.
RFP 2: All tax returns for the years 2020-2023.
RFP 3: All credit card statements showing transactions over $500.
Interrogatory 1: State your full legal name and current address.`}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />

            <Button
              onClick={handleProcessText}
              disabled={isProcessing || !pastedText.trim()}
              className="w-full"
              size="lg"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Analyze Requests
            </Button>
          </div>
        )}

        {/* Existing Requests Notice */}
        {existingRequestCount > 0 && onAnalyzeExisting && !isProcessing && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{existingRequestCount} requests already loaded</span>
              </div>
              <Button variant="outline" size="sm" onClick={onAnalyzeExisting}>
                View Analysis
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
