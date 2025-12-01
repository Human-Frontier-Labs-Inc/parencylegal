"use client";

/**
 * PDF Viewer Component
 * Phase 12.2: Document Experience - Inline PDF viewing
 *
 * Uses @react-pdf-viewer for full-featured PDF display
 */

import { useState, useEffect } from "react";
import { Viewer, Worker, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import { Button } from "@/components/ui/button";
import {
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileText,
  Image as ImageIcon
} from "lucide-react";

interface PDFViewerProps {
  /** URL to the PDF file */
  fileUrl: string | null;
  /** Original filename for display */
  fileName: string;
  /** File type (pdf, png, jpg, etc) */
  fileType: string;
  /** Height of the viewer (default: 600px) */
  height?: string;
  /** Callback when download is clicked */
  onDownload?: () => void;
  /** Whether the URL is still loading */
  isLoading?: boolean;
}

export function PDFViewer({
  fileUrl,
  fileName,
  fileType,
  height = "600px",
  onDownload,
  isLoading = false,
}: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize the default layout plugin with toolbar
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [defaultTabs[0]], // Only show thumbnails
    toolbarPlugin: {
      fullScreenPlugin: {
        onEnterFullScreen: (zoom) => {
          zoom(SpecialZoomLevel.PageFit);
        },
        onExitFullScreen: (zoom) => {
          zoom(SpecialZoomLevel.PageFit);
        },
      },
    },
  });

  const isPDF = fileType.toLowerCase() === "pdf" || fileType.toLowerCase() === "application/pdf";
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "image/png", "image/jpeg", "image/gif", "image/webp"].includes(fileType.toLowerCase());

  // Handle loading state
  useEffect(() => {
    if (fileUrl) {
      setLoading(false);
    }
  }, [fileUrl]);

  // Show loading state while fetching preview URL
  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-muted rounded-lg border"
        style={{ height }}
      >
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-lg font-medium mb-2">Loading Document...</p>
        <p className="text-sm text-muted-foreground">
          Fetching document from storage
        </p>
      </div>
    );
  }

  if (!fileUrl) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-muted rounded-lg border"
        style={{ height }}
      >
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">Document Preview Unavailable</p>
        <p className="text-sm text-muted-foreground mb-4">
          The document URL is not available for preview.
        </p>
        {onDownload && (
          <Button variant="outline" onClick={onDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download Original
          </Button>
        )}
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="relative rounded-lg border overflow-hidden bg-muted" style={{ height }}>
        {/* Toolbar */}
        <div className="absolute top-0 left-0 right-0 bg-background/95 backdrop-blur border-b p-2 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium truncate max-w-[200px]">{fileName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                Open
              </a>
            </Button>
            {onDownload && (
              <Button variant="ghost" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            )}
          </div>
        </div>

        {/* Image */}
        <div className="pt-12 h-full flex items-center justify-center p-4 overflow-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain"
            onError={() => setError("Failed to load image")}
          />
        </div>
      </div>
    );
  }

  if (!isPDF) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-muted rounded-lg border"
        style={{ height }}
      >
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">Preview Not Available</p>
        <p className="text-sm text-muted-foreground mb-4">
          Preview is only available for PDF and image files.
          <br />
          File type: {fileType.toUpperCase()}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </a>
          </Button>
          {onDownload && (
            <Button onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center bg-muted rounded-lg border"
        style={{ height }}
      >
        <AlertCircle className="h-16 w-16 text-destructive mb-4" />
        <p className="text-lg font-medium mb-2">Failed to Load PDF</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setError(null)}>
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ height }}>
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer
          fileUrl={fileUrl}
          plugins={[defaultLayoutPluginInstance]}
          defaultScale={SpecialZoomLevel.PageFit}
          onDocumentLoad={() => setLoading(false)}
          renderError={(error) => {
            setError(error.message || "Failed to load PDF");
            return (
              <div className="flex flex-col items-center justify-center h-full">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <p>Error loading PDF</p>
              </div>
            );
          }}
          renderLoader={(percentages) => (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                Loading PDF... {Math.round(percentages)}%
              </p>
            </div>
          )}
        />
      </Worker>
    </div>
  );
}
