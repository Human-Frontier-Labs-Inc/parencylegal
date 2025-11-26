"use client";

/**
 * Case Settings Page
 * Allows editing case details and Dropbox folder configuration
 */

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Save, Trash2, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { FolderPicker } from "@/components/dropbox/folder-picker";

interface CaseData {
  id: string;
  name: string;
  clientName: string | null;
  opposingParty: string | null;
  caseNumber: string | null;
  status: string;
  dropboxFolderPath: string | null;
  dropboxFolderId: string | null;
  notes: string | null;
}

export default function CaseSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [opposingParty, setOpposingParty] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [dropboxFolderPath, setDropboxFolderPath] = useState("");

  useEffect(() => {
    fetchCase();
  }, [caseId]);

  const fetchCase = async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Case not found");
          router.push("/dashboard/cases");
          return;
        }
        throw new Error("Failed to fetch case");
      }

      const data = await response.json();
      setCaseData(data);

      // Populate form
      setName(data.name || "");
      setClientName(data.clientName || "");
      setOpposingParty(data.opposingParty || "");
      setCaseNumber(data.caseNumber || "");
      setStatus(data.status || "active");
      setNotes(data.notes || "");
      setDropboxFolderPath(data.dropboxFolderPath || "");
    } catch (error) {
      console.error("Error fetching case:", error);
      toast.error("Failed to load case");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Case name is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          clientName: clientName.trim() || null,
          opposingParty: opposingParty.trim() || null,
          caseNumber: caseNumber.trim() || null,
          status,
          notes: notes.trim() || null,
          dropboxFolderPath: dropboxFolderPath || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save");
      }

      toast.success("Case updated successfully");
      router.push(`/dashboard/cases/${caseId}`);
    } catch (error: any) {
      console.error("Error saving case:", error);
      toast.error(error.message || "Failed to save case");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete case");
      }

      toast.success("Case deleted");
      router.push("/dashboard/cases");
    } catch (error) {
      console.error("Error deleting case:", error);
      toast.error("Failed to delete case");
    } finally {
      setDeleting(false);
    }
  };

  const handleFolderSelect = (path: string, id?: string) => {
    setDropboxFolderPath(path);
    setShowFolderPicker(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!caseData) {
    return null;
  }

  return (
    <main className="p-6 md:p-10 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/dashboard/cases/${caseId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Case Settings</h1>
          <p className="text-muted-foreground">{caseData.name}</p>
        </div>
      </div>

      {/* Case Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Case Details</CardTitle>
          <CardDescription>
            Update your case information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Case Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter case name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="opposingParty">Opposing Party</Label>
              <Input
                id="opposingParty"
                value={opposingParty}
                onChange={(e) => setOpposingParty(e.target.value)}
                placeholder="Opposing party"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="caseNumber">Case Number</Label>
              <Input
                id="caseNumber"
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                placeholder="e.g., 2024-CV-001234"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Case notes..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dropbox Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Dropbox Folder</CardTitle>
          <CardDescription>
            Link a Dropbox folder to sync documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  value={dropboxFolderPath}
                  placeholder="No folder selected"
                  readOnly
                  className="bg-muted"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFolderPicker(true)}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                Browse
              </Button>
            </div>

            {dropboxFolderPath && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => setDropboxFolderPath("")}
              >
                Remove folder connection
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                {deleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete Case
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Case?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &quot;{caseData.name}&quot; and all its
                  documents. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-4 mt-6">
        <Link href={`/dashboard/cases/${caseId}`}>
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Folder Picker Modal */}
      {showFolderPicker && (
        <FolderPicker
          onSelect={handleFolderSelect}
          onCancel={() => setShowFolderPicker(false)}
          currentPath={dropboxFolderPath}
        />
      )}
    </main>
  );
}
