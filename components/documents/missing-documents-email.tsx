/**
 * Missing Documents Email Template Generator
 * Phase 12.5.4: Generate email templates to request missing documents from clients
 */
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mail,
  Copy,
  Check,
  AlertCircle,
  FileX,
  Calendar,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MissingDocument {
  type: string;
  description: string;
  period?: string;
  institution?: string;
  priority: "high" | "medium" | "low";
}

interface MissingDocumentsEmailProps {
  caseName: string;
  clientName: string;
  missingDocuments?: MissingDocument[];
  // For gap detection
  documentGaps?: {
    category: string;
    subtype: string;
    missingPeriods: string[];
  }[];
  trigger?: React.ReactNode;
}

// Default missing document types for family law cases
const DEFAULT_DOCUMENT_TYPES = [
  { type: "Bank Statements", description: "Monthly bank statements for all accounts", priority: "high" as const },
  { type: "Pay Stubs", description: "Recent pay stubs (last 3-6 months)", priority: "high" as const },
  { type: "Tax Returns", description: "Federal and state tax returns (last 2-3 years)", priority: "high" as const },
  { type: "Credit Card Statements", description: "Monthly credit card statements", priority: "medium" as const },
  { type: "Investment Statements", description: "401(k), IRA, brokerage account statements", priority: "medium" as const },
  { type: "Property Documents", description: "Deeds, titles, mortgage statements", priority: "medium" as const },
  { type: "Insurance Policies", description: "Life, health, auto, home insurance", priority: "low" as const },
  { type: "Vehicle Titles", description: "Titles for all vehicles owned", priority: "low" as const },
];

// Email templates
const EMAIL_TEMPLATES = {
  formal: {
    name: "Formal",
    greeting: "Dear {clientName},",
    intro: "I hope this message finds you well. As we continue to prepare your case, we require additional documentation to ensure we have a complete record.",
    closing: "Please provide these documents at your earliest convenience. If you have any questions or need assistance locating any of these items, please do not hesitate to contact our office.",
    signature: "Best regards,\n{attorneyName}\n{firmName}",
  },
  friendly: {
    name: "Friendly",
    greeting: "Hi {clientName},",
    intro: "I wanted to follow up on some documents we still need for your case. Having these will help us build the strongest possible case for you.",
    closing: "Let me know if you have any trouble finding these, and we can discuss alternatives or help you request copies from the relevant institutions.",
    signature: "Thanks,\n{attorneyName}",
  },
  urgent: {
    name: "Urgent",
    greeting: "Dear {clientName},",
    intro: "This is an urgent request for documents that are critical for your upcoming court date/filing deadline. We need these items as soon as possible.",
    closing: "TIME-SENSITIVE: Please prioritize gathering these documents and send them within the next [X] days. Delays may impact our ability to meet court deadlines.",
    signature: "Regards,\n{attorneyName}\n{firmName}",
  },
};

export default function MissingDocumentsEmail({
  caseName,
  clientName,
  missingDocuments = [],
  documentGaps = [],
  trigger,
}: MissingDocumentsEmailProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [template, setTemplate] = useState<keyof typeof EMAIL_TEMPLATES>("formal");
  const [attorneyName, setAttorneyName] = useState("");
  const [firmName, setFirmName] = useState("Parency Legal");
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [customDocs, setCustomDocs] = useState<string>("");

  // Combine provided missing docs with gaps
  const allMissingDocs = useMemo(() => {
    const docs: MissingDocument[] = [...missingDocuments];

    // Convert gaps to missing documents
    for (const gap of documentGaps) {
      for (const period of gap.missingPeriods) {
        docs.push({
          type: gap.subtype || gap.category,
          description: `Missing ${gap.subtype || gap.category}`,
          period,
          priority: "high",
        });
      }
    }

    // If no specific documents, use defaults
    if (docs.length === 0) {
      return DEFAULT_DOCUMENT_TYPES;
    }

    return docs;
  }, [missingDocuments, documentGaps]);

  // Initialize selection
  const toggleDoc = (docType: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docType)) {
      newSelected.delete(docType);
    } else {
      newSelected.add(docType);
    }
    setSelectedDocs(newSelected);
  };

  const selectAll = () => {
    setSelectedDocs(new Set(allMissingDocs.map((d) => d.type)));
  };

  const deselectAll = () => {
    setSelectedDocs(new Set());
  };

  // Generate email text
  const generateEmail = () => {
    const t = EMAIL_TEMPLATES[template];

    // Build document list
    const selectedList = allMissingDocs
      .filter((d) => selectedDocs.has(d.type))
      .map((d) => {
        let line = `• ${d.type}`;
        if (d.period) line += ` (${d.period})`;
        if (d.institution) line += ` - ${d.institution}`;
        if (d.description && !d.period) line += `: ${d.description}`;
        return line;
      })
      .join("\n");

    // Add custom docs
    const customList = customDocs
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => `• ${line.trim()}`)
      .join("\n");

    const fullList = [selectedList, customList].filter(Boolean).join("\n");

    // Replace placeholders
    const email = `Subject: Document Request - ${caseName}

${t.greeting.replace("{clientName}", clientName)}

${t.intro}

Re: ${caseName}

The following documents are needed:

${fullList || "• [Please select documents above]"}

${t.closing}

${t.signature
  .replace("{attorneyName}", attorneyName || "[Your Name]")
  .replace("{firmName}", firmName)}`;

    return email;
  };

  const emailText = generateEmail();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(emailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleOpenMailto = () => {
    const subject = encodeURIComponent(`Document Request - ${caseName}`);
    const body = encodeURIComponent(emailText.replace(`Subject: Document Request - ${caseName}\n\n`, ""));
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Mail className="w-4 h-4 mr-2" />
            Request Missing Documents
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Generate Document Request Email
          </DialogTitle>
          <DialogDescription>
            Create an email to request missing documents from your client for{" "}
            <strong>{caseName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          {/* Left column: Settings and document selection */}
          <div className="space-y-4">
            {/* Template selection */}
            <div>
              <Label>Email Tone</Label>
              <Select value={template} onValueChange={(v) => setTemplate(v as keyof typeof EMAIL_TEMPLATES)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EMAIL_TEMPLATES).map(([key, t]) => (
                    <SelectItem key={key} value={key}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Attorney name */}
            <div>
              <Label>Your Name</Label>
              <Input
                value={attorneyName}
                onChange={(e) => setAttorneyName(e.target.value)}
                placeholder="Attorney name for signature"
                className="mt-1"
              />
            </div>

            {/* Firm name */}
            <div>
              <Label>Firm Name</Label>
              <Input
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="Law firm name"
                className="mt-1"
              />
            </div>

            {/* Document selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Documents to Request</Label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Clear
                  </Button>
                </div>
              </div>
              <Card>
                <CardContent className="p-3 max-h-48 overflow-y-auto space-y-2">
                  {allMissingDocs.map((doc, idx) => (
                    <div
                      key={`${doc.type}-${idx}`}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-md cursor-pointer hover:bg-muted transition-colors",
                        selectedDocs.has(doc.type) && "bg-primary/10"
                      )}
                      onClick={() => toggleDoc(doc.type)}
                    >
                      <Checkbox
                        checked={selectedDocs.has(doc.type)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{doc.type}</span>
                          {doc.priority === "high" && (
                            <Badge variant="destructive" className="text-xs py-0">
                              High Priority
                            </Badge>
                          )}
                        </div>
                        {doc.period && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {doc.period}
                          </div>
                        )}
                        {doc.institution && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {doc.institution}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Custom documents */}
            <div>
              <Label>Additional Documents (one per line)</Label>
              <Textarea
                value={customDocs}
                onChange={(e) => setCustomDocs(e.target.value)}
                placeholder="Add any other specific documents..."
                className="mt-1 h-20"
              />
            </div>
          </div>

          {/* Right column: Email preview */}
          <div className="space-y-2">
            <Label>Email Preview</Label>
            <Card className="h-[calc(100%-2rem)]">
              <CardContent className="p-4 h-full">
                <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground h-full overflow-y-auto">
                  {emailText}
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button onClick={handleOpenMailto}>
            <Mail className="w-4 h-4 mr-2" />
            Open in Email App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
