"use client";

/**
 * New Case Page
 * Form to create a new case with optional Dropbox folder
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Folder, Check } from "lucide-react";
import { FolderPicker } from "@/components/dropbox/folder-picker";

interface FormData {
  name: string;
  clientName: string;
  opposingParty: string;
  caseNumber: string;
  status: string;
  notes: string;
  dropboxFolderPath: string;
  dropboxFolderId: string;
}

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    clientName: "",
    opposingParty: "",
    caseNumber: "",
    status: "active",
    notes: "",
    dropboxFolderPath: "",
    dropboxFolderId: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({ ...prev, status: value }));
  };

  const handleFolderSelect = (folderId: string, folderPath: string) => {
    setFormData((prev) => ({
      ...prev,
      dropboxFolderId: folderId,
      dropboxFolderPath: folderPath,
    }));
    setShowFolderPicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Case name is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          clientName: formData.clientName || undefined,
          opposingParty: formData.opposingParty || undefined,
          caseNumber: formData.caseNumber || undefined,
          status: formData.status,
          notes: formData.notes || undefined,
          dropboxFolderPath: formData.dropboxFolderPath || undefined,
          dropboxFolderId: formData.dropboxFolderId || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create case");
      }

      const newCase = await response.json();
      router.push(`/dashboard/cases/${newCase.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 md:p-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/cases"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Cases
        </Link>
        <h1 className="text-3xl font-bold">Create New Case</h1>
        <p className="text-muted-foreground mt-1">
          Set up a new case and optionally connect a Dropbox folder
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Case Information</CardTitle>
              <CardDescription>
                Enter the basic details for this case
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Case Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Smith v. Jones"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    name="clientName"
                    placeholder="Client's full name"
                    value={formData.clientName}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="opposingParty">Opposing Party</Label>
                  <Input
                    id="opposingParty"
                    name="opposingParty"
                    placeholder="Opposing party name"
                    value={formData.opposingParty}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="caseNumber">Case Number</Label>
                  <Input
                    id="caseNumber"
                    name="caseNumber"
                    placeholder="e.g., 2024-CV-12345"
                    value={formData.caseNumber}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={handleStatusChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="discovery">Discovery</SelectItem>
                      <SelectItem value="trial_prep">Trial Prep</SelectItem>
                      <SelectItem value="settlement">Settlement</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Any additional notes about this case..."
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dropbox Connection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Folder className="mr-2 h-5 w-5" />
                Dropbox Folder
              </CardTitle>
              <CardDescription>
                Connect a Dropbox folder to automatically sync documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formData.dropboxFolderPath ? (
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-green-600 mr-3" />
                    <div>
                      <p className="font-medium">Folder Selected</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {formData.dropboxFolderPath}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFolderPicker(true)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Folder className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No folder selected. You can add one later.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowFolderPicker(true)}
                  >
                    <Folder className="mr-2 h-4 w-4" />
                    Select Dropbox Folder
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
              {error}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Link href="/dashboard/cases">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create Case
            </Button>
          </div>
        </div>
      </form>

      {/* Folder Picker Dialog */}
      {showFolderPicker && (
        <FolderPicker
          onSelect={handleFolderSelect}
          onCancel={() => setShowFolderPicker(false)}
        />
      )}
    </main>
  );
}
