import type { Result } from '../lib/result';

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

/**
 * DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false }).
 * canceled → CANCELLED; size > MAX_RESUME_BYTES → TOO_LARGE; mimeType not application/pdf and name
 * not ending ".pdf" (case-insensitive) → NOT_PDF.
 */
export async function pickPdf(): Promise<Result<PickedPdf, PickPdfError>> {
  // TODO(T-019): implement.
  return { ok: false, error: 'CANCELLED' };
}

/** Reads a file as base64 (for AI-1 PDF input). Resolves null on failure. */
export async function readFileBase64(uri: string): Promise<string | null> {
  // TODO(T-019): implement with new File(uri).base64().
  void uri;
  return null;
}

/**
 * Copies a picked PDF to `${Paths.document}/resumes/<resumeId>.pdf` (creating the directory,
 * overwriting an existing file) and returns the destination URI, or null on failure.
 */
export async function storeResumePdf(sourceUri: string, resumeId: number): Promise<string | null> {
  // TODO(T-019): implement.
  void sourceUri;
  void resumeId;
  return null;
}

/** Deletes the stored copy if it exists. Never throws. */
export async function deleteResumePdf(fileUri: string): Promise<void> {
  // TODO(T-039): implement.
  void fileUri;
}
