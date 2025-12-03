"use client";

/**
 * Cloud Storage Settings Component
 * Unified settings panel for managing all cloud storage connections
 */

import { useState, useEffect } from "react";
import { ConnectionCard } from "./connection-card";
import { CloudStorageProviderType } from "@/lib/cloud-storage/types";
import { toast } from "sonner";

interface ProviderStatus {
  connected: boolean;
  accountEmail: string | null;
  accountName: string | null;
  lastVerifiedAt?: Date | string | null;
  needsReauth?: boolean;
}

interface CloudStorageSettingsProps {
  onConnectionChange?: () => void;
}

const PROVIDER_CONFIG: Record<
  CloudStorageProviderType,
  {
    displayName: string;
    description: string;
    features: string[];
    authUrl: string;
    statusUrl: string;
    disconnectUrl: string;
    callbackParam: string;
  }
> = {
  dropbox: {
    displayName: "Dropbox",
    description: "Connect your Dropbox account to sync case documents",
    features: [
      "Map cases to Dropbox folders",
      "Sync documents automatically",
      "Detect duplicate files",
      "Track sync history",
    ],
    authUrl: "/api/auth/dropbox",
    statusUrl: "/api/auth/dropbox/status",
    disconnectUrl: "/api/auth/dropbox",
    callbackParam: "dropbox",
  },
  onedrive: {
    displayName: "OneDrive",
    description: "Connect your Microsoft OneDrive account to access files",
    features: [
      "Access OneDrive files and folders",
      "Import documents to cases",
      "Browse shared folders",
      "Download files for analysis",
    ],
    authUrl: "/api/auth/onedrive",
    statusUrl: "/api/auth/onedrive/status",
    disconnectUrl: "/api/auth/onedrive",
    callbackParam: "onedrive",
  },
};

export function CloudStorageSettings({
  onConnectionChange,
}: CloudStorageSettingsProps) {
  const [statuses, setStatuses] = useState<
    Record<CloudStorageProviderType, ProviderStatus | null>
  >({
    dropbox: null,
    onedrive: null,
  });
  const [loading, setLoading] = useState<Record<CloudStorageProviderType, boolean>>({
    dropbox: true,
    onedrive: true,
  });

  // Fetch all provider statuses on mount
  useEffect(() => {
    fetchAllStatuses();
  }, []);

  // Check for OAuth callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Check each provider's callback param
    for (const [provider, config] of Object.entries(PROVIDER_CONFIG)) {
      const status = params.get(config.callbackParam);
      const message = params.get("message");

      if (status === "connected") {
        toast.success(`${config.displayName} connected successfully!`);
        // Clean up URL and refresh status
        window.history.replaceState({}, "", window.location.pathname);
        fetchStatus(provider as CloudStorageProviderType);
        onConnectionChange?.();
      } else if (status === "error") {
        toast.error(message || `Failed to connect ${config.displayName}`);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [onConnectionChange]);

  const fetchAllStatuses = async () => {
    const providers = Object.keys(PROVIDER_CONFIG) as CloudStorageProviderType[];
    await Promise.all(providers.map(fetchStatus));
  };

  const fetchStatus = async (provider: CloudStorageProviderType) => {
    const config = PROVIDER_CONFIG[provider];
    try {
      setLoading((prev) => ({ ...prev, [provider]: true }));
      const response = await fetch(config.statusUrl);
      if (response.ok) {
        const data = await response.json();
        setStatuses((prev) => ({ ...prev, [provider]: data }));
      }
    } catch (error) {
      console.error(`Failed to fetch ${provider} status:`, error);
    } finally {
      setLoading((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleConnect = (provider: CloudStorageProviderType) => {
    const config = PROVIDER_CONFIG[provider];
    window.location.href = config.authUrl;
  };

  const handleDisconnect = async (provider: CloudStorageProviderType) => {
    const config = PROVIDER_CONFIG[provider];
    const response = await fetch(config.disconnectUrl, {
      method: "DELETE",
    });

    if (response.ok) {
      setStatuses((prev) => ({
        ...prev,
        [provider]: {
          connected: false,
          accountEmail: null,
          accountName: null,
          lastVerifiedAt: null,
          needsReauth: false,
        },
      }));
      onConnectionChange?.();
    } else {
      const data = await response.json();
      throw new Error(data.error || `Failed to disconnect ${config.displayName}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Cloud Storage Integrations
        </h2>
        <p className="text-muted-foreground">
          Connect your cloud storage accounts to access and sync documents
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {(Object.keys(PROVIDER_CONFIG) as CloudStorageProviderType[]).map(
          (provider) => {
            const config = PROVIDER_CONFIG[provider];
            return (
              <ConnectionCard
                key={provider}
                provider={provider}
                displayName={config.displayName}
                description={config.description}
                status={statuses[provider]}
                loading={loading[provider]}
                onConnect={() => handleConnect(provider)}
                onDisconnect={() => handleDisconnect(provider)}
                features={config.features}
              />
            );
          }
        )}
      </div>
    </div>
  );
}
