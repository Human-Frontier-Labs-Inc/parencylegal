"use client";

/**
 * Cloud Storage Provider Icons
 * SVG icons for each supported cloud storage provider
 */

import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
}

export function DropboxIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("h-5 w-5", className)}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4zm12 0l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4zM6 14l6 4 6-4-6-4-6 4z" />
    </svg>
  );
}

export function OneDriveIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("h-5 w-5", className)}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M10.5 3c-1.8 0-3.4.8-4.5 2.1C5 4.4 4 4 3 4c-2 0-3 1.5-3 3.5 0 .6.1 1.1.3 1.6C.1 9.7 0 10.3 0 11c0 2.8 2.2 5 5 5h14c2.8 0 5-2.2 5-5 0-2.3-1.5-4.2-3.6-4.8-.2-1.9-1.8-3.2-3.9-3.2-.7 0-1.4.2-2 .5C13.4 2 12 1 10.5 1V3z" />
    </svg>
  );
}

export function GoogleDriveIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("h-5 w-5", className)}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M7.71 3.5L1.15 15l3.43 6h13.71l3.43-6-6.56-11.5H7.71zM12 8l4 7H8l4-7z" />
    </svg>
  );
}

export function CloudIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("h-5 w-5", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}

export function getProviderIcon(provider: string) {
  switch (provider) {
    case "dropbox":
      return DropboxIcon;
    case "onedrive":
      return OneDriveIcon;
    case "googledrive":
      return GoogleDriveIcon;
    default:
      return CloudIcon;
  }
}

export function getProviderColor(provider: string): string {
  switch (provider) {
    case "dropbox":
      return "text-blue-600";
    case "onedrive":
      return "text-sky-600";
    case "googledrive":
      return "text-yellow-500";
    default:
      return "text-gray-600";
  }
}

export function getProviderBgColor(provider: string): string {
  switch (provider) {
    case "dropbox":
      return "bg-blue-50 dark:bg-blue-950";
    case "onedrive":
      return "bg-sky-50 dark:bg-sky-950";
    case "googledrive":
      return "bg-yellow-50 dark:bg-yellow-950";
    default:
      return "bg-gray-50 dark:bg-gray-900";
  }
}
