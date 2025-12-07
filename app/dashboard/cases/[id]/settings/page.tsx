"use client";

/**
 * Case Settings Page
 * Allows editing case details and cloud storage folder configuration
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
import { ArrowLeft, Loader2, Save, Trash2, Cloud, Users, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { UnifiedFolderPicker } from "@/components/cloud-storage";
import { useCloudStorage } from "@/hooks/use-cloud-storage";
import { CloudStorageProviderType } from "@/lib/cloud-storage/types";

interface CaseData {
  id: string;
  name: string;
  clientName: string | null;
  opposingParty: string | null;
  caseNumber: string | null;
  status: string;
  cloudStorageProvider: string | null;
  cloudFolderPath: string | null;
  cloudFolderId: string | null;
  // Legacy fields
  dropboxFolderPath: string | null;
  dropboxFolderId: string | null;
  notes: string | null;
  // Parent sync fields
  parentSyncToken: string | null;
  parentSyncConnectedAt: string | null;
  parentName: string | null;
  parentEmail: string | null;
}

export default function CaseSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;
  const { connectedProviders, loading: loadingConnections } = useCloudStorage();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [caseData, setCaseData] = useState<CaseData | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [opposingParty, setOpposingParty] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");
  const [cloudStorageProvider, setCloudStorageProvider] = useState<CloudStorageProviderType | null>(null);
  const [cloudFolderPath, setCloudFolderPath] = useState("");
  const [cloudFolderId, setCloudFolderId] = useState("");

  // Parent sync state
  const [parentSyncToken, setParentSyncToken] = useState("");
  const [parentSyncTokenInput, setParentSyncTokenInput] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentSyncConnectedAt, setParentSyncConnectedAt] = useState<string | null>(null);
  const [connectingParent, setConnectingParent] = useState(false);
  const [disconnectingParent, setDisconnectingParent] = useState(false);

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
      // Use new cloud storage fields, fallback to legacy dropbox fields
      setCloudStorageProvider(data.cloudStorageProvider || (data.dropboxFolderPath ? "dropbox" : null));
      setCloudFolderPath(data.cloudFolderPath || data.dropboxFolderPath || "");
      setCloudFolderId(data.cloudFolderId || data.dropboxFolderId || "");
      // Parent sync fields
      setParentSyncToken(data.parentSyncToken || "");
      setParentName(data.parentName || "");
      setParentEmail(data.parentEmail || "");
      setParentSyncConnectedAt(data.parentSyncConnectedAt || null);
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
          cloudStorageProvider: cloudStorageProvider || null,
          cloudFolderPath: cloudFolderPath || null,
          cloudFolderId: cloudFolderId || null,
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

  const handleFolderSelect = (selection: {
    provider: CloudStorageProviderType;
    folderId: string;
    folderPath: string;
  }) => {
    setCloudStorageProvider(selection.provider);
    setCloudFolderPath(selection.folderPath);
    setCloudFolderId(selection.folderId);
  };

  const handleRemoveFolder = () => {
    setCloudStorageProvider(null);
    setCloudFolderPath("");
    setCloudFolderId("");
  };

  const handleConnectParent = async () => {
    if (!parentSyncTokenInput.trim()) {
      toast.error("Please enter a token");
      return;
    }

    setConnectingParent(true);
    try {
      // Validate the token by calling the parent API
      const response = await fetch("/api/cases/validate-parent-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: parentSyncTokenInput.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Invalid or revoked token");
        return;
      }

      const data = await response.json();

      // Save to case
      const saveResponse = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentSyncToken: parentSyncTokenInput.trim(),
          parentSyncConnectedAt: new Date().toISOString(),
          parentName: data.parent.name,
          parentEmail: data.parent.email,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save connection");
      }

      // Update local state
      setParentSyncToken(parentSyncTokenInput.trim());
      setParentName(data.parent.name);
      setParentEmail(data.parent.email);
      setParentSyncConnectedAt(new Date().toISOString());
      setParentSyncTokenInput("");
      toast.success(`Connected to ${data.parent.name}`);
    } catch (error: any) {
      console.error("Error connecting to parent:", error);
      toast.error(error.message || "Failed to connect");
    } finally {
      setConnectingParent(false);
    }
  };

  const handleDisconnectParent = async () => {
    setDisconnectingParent(true);
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentSyncToken: null,
          parentSyncConnectedAt: null,
          parentName: null,
          parentEmail: null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect");
      }

      setParentSyncToken("");
      setParentName("");
      setParentEmail("");
      setParentSyncConnectedAt(null);
      toast.success("Disconnected from parent");
    } catch (error: any) {
      console.error("Error disconnecting:", error);
      toast.error(error.message || "Failed to disconnect");
    } finally {
      setDisconnectingParent(false);
    }
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

      {/* Cloud Storage Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Cloud Storage Folder
          </CardTitle>
          <CardDescription>
            Link a folder from Dropbox or OneDrive to sync documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cloudFolderPath ? (
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      Connected
                      <span className="text-xs bg-muted px-2 py-0.5 rounded capitalize">
                        {cloudStorageProvider}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground font-mono mt-1">
                      {cloudFolderPath}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveFolder}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : loadingConnections ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : connectedProviders.length === 0 ? (
              <div className="text-center py-6">
                <Cloud className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  No cloud storage connected. Connect Dropbox or OneDrive in Settings.
                </p>
                <Link href="/dashboard/settings">
                  <Button variant="outline">Go to Settings</Button>
                </Link>
              </div>
            ) : (
              <UnifiedFolderPicker
                value={cloudFolderPath ? { provider: cloudStorageProvider!, path: cloudFolderPath } : null}
                onSelect={handleFolderSelect}
                connections={connectedProviders}
                placeholder="Select cloud folder..."
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* CoParency Parent Integration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            CoParency Parent Sync
          </CardTitle>
          <CardDescription>
            Connect to a parent&apos;s CoParency account to access their shared data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {parentSyncToken ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium">Connected</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {parentName} ({parentEmail})
                      </p>
                      {parentSyncConnectedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Connected {new Date(parentSyncConnectedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={disconnectingParent}
                      >
                        {disconnectingParent ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Disconnect"
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect from parent?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You will no longer be able to access {parentName}&apos;s shared data.
                          You can reconnect later with a new token.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisconnectParent}>
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                View shared data in the &quot;Parent Sync&quot; tab on the case detail page.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parentToken">Parent Access Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="parentToken"
                    value={parentSyncTokenInput}
                    onChange={(e) => setParentSyncTokenInput(e.target.value)}
                    placeholder="Paste the 64-character token from the parent"
                    className="font-mono text-sm"
                  />
                  <Button
                    onClick={handleConnectParent}
                    disabled={connectingParent || !parentSyncTokenInput.trim()}
                  >
                    {connectingParent ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Connect
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ask the parent to generate an access token from their CoParency account
                  at Settings &rarr; Lawyer Access.
                </p>
              </div>
            </div>
          )}
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

    </main>
  );
}
