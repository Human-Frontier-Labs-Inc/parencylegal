"use client";

/**
 * Dropbox Connection Component
 * Allows users to connect/disconnect their Dropbox account
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, Link2Off, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface DropboxStatus {
  connected: boolean;
  accountEmail: string | null;
  accountName: string | null;
  lastVerified: string | null;
}

export function DropboxConnection() {
  const [status, setStatus] = useState<DropboxStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  // Fetch Dropbox connection status
  useEffect(() => {
    fetchStatus();
  }, []);

  // Check for OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dropboxStatus = params.get("dropbox");
    const message = params.get("message");

    if (dropboxStatus === "connected") {
      toast.success("Dropbox connected successfully!");
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
      fetchStatus();
    } else if (dropboxStatus === "error") {
      toast.error(message || "Failed to connect Dropbox");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/dropbox/status");
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch Dropbox status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Redirect to Dropbox OAuth
    window.location.href = "/api/auth/dropbox";
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Dropbox?")) {
      return;
    }

    try {
      setDisconnecting(true);
      const response = await fetch("/api/auth/dropbox", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Dropbox disconnected");
        setStatus({ connected: false, accountEmail: null, accountName: null, lastVerified: null });
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to disconnect Dropbox");
      }
    } catch (error) {
      toast.error("Failed to disconnect Dropbox");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4zm12 0l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4zM6 14l6 4 6-4-6-4-6 4z"/>
            </svg>
            Dropbox Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4zm12 0l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4zM6 14l6 4 6-4-6-4-6 4z"/>
          </svg>
          Dropbox Integration
        </CardTitle>
        <CardDescription>
          Connect your Dropbox account to sync case documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected ? (
          <>
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-800 dark:text-green-200">
                  Connected
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {status.accountName || status.accountEmail}
                </p>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                Active
              </Badge>
            </div>

            {status.accountEmail && status.accountEmail !== status.accountName && (
              <p className="text-sm text-muted-foreground">
                Email: {status.accountEmail}
              </p>
            )}

            {status.lastVerified && (
              <p className="text-xs text-muted-foreground">
                Last verified: {new Date(status.lastVerified).toLocaleDateString()}
              </p>
            )}

            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="w-full"
            >
              {disconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <Link2Off className="mr-2 h-4 w-4" />
                  Disconnect Dropbox
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Not Connected</p>
                <p className="text-sm text-muted-foreground">
                  Connect Dropbox to sync your case documents
                </p>
              </div>
            </div>

            <Button onClick={handleConnect} className="w-full">
              <Link2 className="mr-2 h-4 w-4" />
              Connect Dropbox
            </Button>
          </>
        )}

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">What you can do:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Map cases to Dropbox folders</li>
            <li>• Sync documents automatically</li>
            <li>• Detect duplicate files</li>
            <li>• Track sync history</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
