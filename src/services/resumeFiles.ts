import { getDocumentAsync } from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';

import { err, ok, type Result } from '../lib/result';

/**
 * The app's private copies of the user's resume PDFs: `${Paths.document}/resumes/<resumeId>.pdf`
 * (expo-file-system `File`, `Directory`, `Paths`). CONTRACT: ARCHITECTURE.md §6.4.
 */

export const MAX_RESUME_BYTES = 10 * 1024 * 1024;

export interface PickedPdf {
  /** Cache URI returned by the picker (temporary). */
  uri: string;
  /** Original file name, e.g. "Alex_Rahman_Backend.pdf". */
  name: string;
  size: number;
}

export type PickPdfError = 'CANCELLED' | 'TOO_LARGE' | 'NOT_PDF';

function isPdfAsset(name: string, mimeType: string | undefined): boolean {
  if (mimeType === 'application/pdf') return true;
  return name.toLowerCase().endsWith('.pdf');
}

/**
 * DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false }).
 * canceled → CANCELLED; size > MAX_RESUME_BYTES → TOO_LARGE; mimeType not application/pdf and name
 * not ending ".pdf" (case-insensitive) → NOT_PDF.
 */
export async function pickPdf(): Promise<Result<PickedPdf, PickPdfError>> {
  const picked = await getDocumentAsync({
    type: 'application/pdf',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled) return err('CANCELLED');
  const asset = picked.assets[0];
  if (!asset) return err('CANCELLED');
  const size = typeof asset.size === 'number' ? asset.size : 0;
  if (size > MAX_RESUME_BYTES) return err('TOO_LARGE');
  if (!isPdfAsset(asset.name, asset.mimeType)) return err('NOT_PDF');
  return ok({ uri: asset.uri, name: asset.name, size });
}

/** Reads a file as base64 (for AI-1 PDF input). Resolves null on failure. */
export async function readFileBase64(uri: string): Promise<string | null> {
  try {
    return await new File(uri).base64();
  } catch {
    return null;
  }
}

/**
 * Copies a picked PDF to `${Paths.document}/resumes/<resumeId>.pdf` (creating the directory,
 * overwriting an existing file) and returns the destination URI, or null on failure.
 */
export async function storeResumePdf(sourceUri: string, resumeId: number): Promise<string | null> {
  try {
    const directory = new Directory(Paths.document, 'resumes');
    if (!directory.exists) directory.create({ idempotent: true });
    const destination = new File(directory, `${resumeId}.pdf`);
    await new File(sourceUri).copy(destination, { overwrite: true });
    return destination.uri;
  } catch {
    return null;
  }
}

/** Deletes the stored copy if it exists. Never throws. */
export async function deleteResumePdf(fileUri: string): Promise<void> {
  try {
    const file = new File(fileUri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Never throws.
  }
}
