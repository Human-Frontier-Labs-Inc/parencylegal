"use client";

/**
 * Cloud Storage Connection Card
 * Generic card component for connecting/disconnecting cloud storage providers
 */

import { useState } from "react";
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
import { CloudStorageProviderType } from "@/lib/cloud-storage/types";
import {
  getProviderIcon,
  getProviderColor,
} from "./provider-icons";

interface ConnectionStatus {
  connected: boolean;
  accountEmail: string | null;
  accountName: string | null;
  lastVerifiedAt?: Date | string | null;
  needsReauth?: boolean;
}

interface ConnectionCardProps {
  provider: CloudStorageProviderType;
  displayName: string;
  description: string;
  status: ConnectionStatus | null;
  loading?: boolean;
  onConnect: () => void;
  onDisconnect: () => Promise<void>;
  features?: string[];
}

export function ConnectionCard({
  provider,
  displayName,
  description,
  status,
  loading = false,
  onConnect,
  onDisconnect,
  features = [],
}: ConnectionCardProps) {
  const [disconnecting, setDisconnecting] = useState(false);
  const Icon = getProviderIcon(provider);
  const iconColor = getProviderColor(provider);

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${displayName}?`)) {
      return;
    }

    try {
      setDisconnecting(true);
      await onDisconnect();
      toast.success(`${displayName} disconnected`);
    } catch (error) {
      toast.error(`Failed to disconnect ${displayName}`);
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className={iconColor} />
            {displayName} Integration
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
          <Icon className={iconColor} />
          {displayName} Integration
        </CardTitle>
        <CardDescription>{description}</CardDescription>
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
              <Badge
                variant="outline"
                className="bg-green-100 text-green-800 border-green-300"
              >
                Active
              </Badge>
            </div>

            {status.accountEmail &&
              status.accountEmail !== status.accountName && (
                <p className="text-sm text-muted-foreground">
                  Email: {status.accountEmail}
                </p>
              )}

            {status.needsReauth && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Connection needs to be refreshed
                </p>
                <Button size="sm" variant="outline" onClick={onConnect}>
                  Reconnect
                </Button>
              </div>
            )}

            {status.lastVerifiedAt && (
              <p className="text-xs text-muted-foreground">
                Last verified:{" "}
                {new Date(status.lastVerifiedAt).toLocaleDateString()}
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
                  Disconnect {displayName}
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
                  Connect {displayName} to sync your case documents
                </p>
              </div>
            </div>

            <Button onClick={onConnect} className="w-full">
              <Link2 className="mr-2 h-4 w-4" />
              Connect {displayName}
            </Button>
          </>
        )}

        {features.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">What you can do:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {features.map((feature, index) => (
                <li key={index}>• {feature}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
