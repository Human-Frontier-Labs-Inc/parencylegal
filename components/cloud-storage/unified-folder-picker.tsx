"use client";

/**
 * Unified Folder Picker Component
 * Allows users to browse and select folders from any connected cloud storage provider
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Folder,
  FolderOpen,
  ChevronRight,
  ArrowLeft,
  Search,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CloudStorageProviderType, CloudStorageFolder } from "@/lib/cloud-storage/types";
import { getProviderIcon, getProviderColor } from "./provider-icons";

interface FolderPickerFolder {
  id: string;
  name: string;
  path: string;
  pathDisplay: string;
  provider: CloudStorageProviderType;
}

interface ProviderConnection {
  provider: CloudStorageProviderType;
  connected: boolean;
  accountName?: string | null;
}

interface UnifiedFolderPickerProps {
  value?: { provider: CloudStorageProviderType; path: string } | null;
  onSelect: (selection: {
    provider: CloudStorageProviderType;
    folderId: string;
    folderPath: string;
  }) => void;
  connections?: ProviderConnection[];
  disabled?: boolean;
  placeholder?: string;
}

export function UnifiedFolderPicker({
  value,
  onSelect,
  connections = [],
  disabled = false,
  placeholder = "Select cloud folder...",
}: UnifiedFolderPickerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [folders, setFolders] = useState<FolderPickerFolder[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [pathHistory, setPathHistory] = useState<string[]>([""]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FolderPickerFolder[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<FolderPickerFolder | null>(null);
  const [activeProvider, setActiveProvider] = useState<CloudStorageProviderType | null>(null);

  // Get connected providers
  const connectedProviders = connections.filter((c) => c.connected);

  // Set initial active provider
  useEffect(() => {
    if (connectedProviders.length > 0 && !activeProvider) {
      setActiveProvider(connectedProviders[0].provider);
    }
  }, [connectedProviders, activeProvider]);

  // Load folders when path or provider changes
  useEffect(() => {
    if (open && activeProvider) {
      loadFolders(currentPath);
    }
  }, [open, currentPath, activeProvider]);

  const loadFolders = async (path: string) => {
    if (!activeProvider) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/${activeProvider}/folders?path=${encodeURIComponent(path)}`
      );

      if (!response.ok) {
        throw new Error("Failed to load folders");
      }

      const data = await response.json();
      setFolders(
        (data.folders || []).map((f: CloudStorageFolder) => ({
          ...f,
          provider: activeProvider,
        }))
      );
    } catch (error) {
      console.error("Failed to load folders:", error);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder: FolderPickerFolder) => {
    setPathHistory([...pathHistory, folder.path]);
    setCurrentPath(folder.path);
    setSelectedFolder(null);
  };

  const handleFolderSelect = (folder: FolderPickerFolder) => {
    setSelectedFolder(folder);
  };

  const handleBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory];
      newHistory.pop();
      setPathHistory(newHistory);
      setCurrentPath(newHistory[newHistory.length - 1]);
      setSelectedFolder(null);
    }
  };

  const handleProviderChange = (provider: string) => {
    setActiveProvider(provider as CloudStorageProviderType);
    setCurrentPath("");
    setPathHistory([""]);
    setSelectedFolder(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !activeProvider) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(
        `/api/${activeProvider}/folders/search?q=${encodeURIComponent(searchQuery)}`
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(
          (data.folders || []).map((f: CloudStorageFolder) => ({
            ...f,
            provider: activeProvider,
          }))
        );
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearching(false);
    }
  }, [searchQuery, activeProvider]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [handleSearch]);

  const handleConfirm = () => {
    if (selectedFolder) {
      onSelect({
        provider: selectedFolder.provider,
        folderId: selectedFolder.id,
        folderPath: selectedFolder.path,
      });
      setOpen(false);
    }
  };

  const displayFolders = searchQuery ? searchResults : folders;

  // Get display value
  const displayValue = value
    ? `${value.provider === "dropbox" ? "Dropbox" : "OneDrive"}: ${value.path || "/"}`
    : placeholder;

  if (connectedProviders.length === 0) {
    return (
      <Button variant="outline" disabled className="w-full justify-start">
        <AlertCircle className="mr-2 h-4 w-4 text-muted-foreground" />
        No cloud storage connected
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="w-full justify-start"
        >
          <Folder className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Select Cloud Folder</DialogTitle>
          <DialogDescription>
            Choose a folder from your connected cloud storage
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Provider Tabs */}
          {connectedProviders.length > 1 && (
            <Tabs value={activeProvider || ""} onValueChange={handleProviderChange}>
              <TabsList className="w-full">
                {connectedProviders.map((conn) => {
                  const Icon = getProviderIcon(conn.provider);
                  const color = getProviderColor(conn.provider);
                  return (
                    <TabsTrigger
                      key={conn.provider}
                      value={conn.provider}
                      className="flex-1"
                    >
                      <Icon className={cn("mr-2 h-4 w-4", color)} />
                      {conn.provider === "dropbox" ? "Dropbox" : "OneDrive"}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Current path breadcrumb */}
          {!searchQuery && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {pathHistory.length > 1 && (
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <span className="font-mono">{currentPath || "/"}</span>
            </div>
          )}

          {/* Folder list */}
          <ScrollArea className="h-[300px] border rounded-md">
            {loading || searching ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : displayFolders.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {searchQuery ? "No folders found" : "No subfolders"}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {displayFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                      selectedFolder?.id === folder.id
                        ? "bg-primary/10 border border-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <button
                      className="flex items-center gap-2 flex-1 text-left"
                      onClick={() => handleFolderSelect(folder)}
                    >
                      {selectedFolder?.id === folder.id ? (
                        <FolderOpen className="h-5 w-5 text-primary" />
                      ) : (
                        <Folder className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="flex-1 truncate">{folder.name}</span>
                      {selectedFolder?.id === folder.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFolderClick(folder);
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Selected folder */}
          {selectedFolder && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">Selected folder:</p>
              <p className="text-sm text-muted-foreground font-mono truncate">
                {selectedFolder.pathDisplay || selectedFolder.path}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedFolder}>
            Select Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
