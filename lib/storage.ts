/**
 * Vercel Blob Storage Helper
 * Replaces Supabase Storage for document storage
 */

import { put, del } from '@vercel/blob';

const DOCUMENTS_FOLDER = 'case-documents';
const EXPORTS_FOLDER = 'exports';

/**
 * Upload a file to blob storage
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(
  path: string,
  data: Buffer | ArrayBuffer | Blob | File,
  options?: { contentType?: string }
): Promise<string> {
  const blob = await put(path, data, {
    access: 'public',
    contentType: options?.contentType,
  });
  return blob.url;
}

/**
 * Upload a case document
 */
export async function uploadDocument(
  caseId: string,
  fileName: string,
  data: Buffer | ArrayBuffer,
  contentType?: string
): Promise<string> {
  const path = `${DOCUMENTS_FOLDER}/${caseId}/${Date.now()}-${fileName}`;
  return uploadFile(path, data, { contentType });
}

/**
 * Upload an export file
 */
export async function uploadExport(
  jobId: string,
  fileName: string,
  data: Buffer | ArrayBuffer
): Promise<string> {
  const path = `${EXPORTS_FOLDER}/${jobId}/${fileName}`;
  return uploadFile(path, data, { contentType: 'application/pdf' });
}

/**
 * Download a file from blob storage
 * Works with any URL (blob URLs are public)
 */
export async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Delete a file from blob storage
 */
export async function deleteFile(url: string): Promise<void> {
  await del(url);
}

/**
 * Get a public URL for a file
 * With Vercel Blob, URLs are already public - no signing needed
 */
export function getPublicUrl(url: string): string {
  return url;
}
