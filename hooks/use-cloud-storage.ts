"use client";

/**
 * Hook to manage cloud storage connections
 * Fetches connection status for all providers
 */

import { useState, useEffect, useCallback } from "react";
import { CloudStorageProviderType } from "@/lib/cloud-storage/types";

export interface CloudStorageConnection {
  provider: CloudStorageProviderType;
  connected: boolean;
  accountEmail: string | null;
  accountName: string | null;
  needsReauth?: boolean;
}

interface UseCloudStorageResult {
  connections: CloudStorageConnection[];
  connectedProviders: CloudStorageConnection[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isConnected: (provider: CloudStorageProviderType) => boolean;
  getConnection: (provider: CloudStorageProviderType) => CloudStorageConnection | undefined;
}

const PROVIDERS: CloudStorageProviderType[] = ["dropbox", "onedrive"];

const PROVIDER_STATUS_URLS: Record<CloudStorageProviderType, string> = {
  dropbox: "/api/auth/dropbox/status",
  onedrive: "/api/auth/onedrive/status",
};

export function useCloudStorage(): UseCloudStorageResult {
  const [connections, setConnections] = useState<CloudStorageConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllStatuses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        PROVIDERS.map(async (provider) => {
          try {
            const response = await fetch(PROVIDER_STATUS_URLS[provider]);
            if (response.ok) {
              const data = await response.json();
              return {
                provider,
                connected: data.connected ?? false,
                accountEmail: data.accountEmail ?? null,
                accountName: data.accountName ?? null,
                needsReauth: data.needsReauth ?? false,
              };
            }
          } catch (e) {
            console.error(`Failed to fetch ${provider} status:`, e);
          }
          return {
            provider,
            connected: false,
            accountEmail: null,
            accountName: null,
            needsReauth: false,
          };
        })
      );

      setConnections(results);
    } catch (e) {
      setError("Failed to fetch cloud storage status");
      console.error("Failed to fetch cloud storage status:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllStatuses();
  }, [fetchAllStatuses]);

  const connectedProviders = connections.filter((c) => c.connected);

  const isConnected = useCallback(
    (provider: CloudStorageProviderType) => {
      return connections.find((c) => c.provider === provider)?.connected ?? false;
    },
    [connections]
  );

  const getConnection = useCallback(
    (provider: CloudStorageProviderType) => {
      return connections.find((c) => c.provider === provider);
    },
    [connections]
  );

  return {
    connections,
    connectedProviders,
    loading,
    error,
    refresh: fetchAllStatuses,
    isConnected,
    getConnection,
  };
}
