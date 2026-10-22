import type { Result } from '../lib/result';
import type { Resume } from '../types/domain';

/**
 * Puts a resume where the WebView's file picker shows it first, and copies the cover note to the
 * clipboard. CONTRACT: ARCHITECTURE.md §6.5.
 */

export type StageResumeErrorCode =
  /** Resume has no PDF (text-only). */
  | 'NO_FILE'
  /** Android: user cancelled the folder picker or refused access. */
  | 'PERMISSION_DENIED'
  /** Stored copy missing or unreadable. */
  | 'FILE_MISSING'
  /** Writing the copy failed (twice on Android). */
  | 'WRITE_FAILED'
  /** iOS: sharing not available. */
  | 'SHARE_UNAVAILABLE';

export type StageResumeOutcome =
  | { platform: 'android'; destinationUri: string; clipboardCopied: boolean }
  | { platform: 'ios'; clipboardCopied: boolean };

export interface StageResumeError {
  code: StageResumeErrorCode;
  clipboardCopied: boolean;
}

/**
 * Exact behaviour:
 * 1. Clipboard.setStringAsync(coverNote) first when coverNote is non-empty; clipboardCopied = true
 *    unless it throws.
 * 2. resume.fileUri null → NO_FILE. File missing (new File(uri).exists false) → FILE_MISSING.
 * 3. Android, with `StorageAccessFramework` from 'expo-file-system/legacy':
 *    a. dirUri = kvGet(KV_KEYS.androidStagingDirUri). If null: requestDirectoryPermissionsAsync(
 *       StorageAccessFramework.getUriForDirectoryInRoot('Download')); not granted → PERMISSION_DENIED;
 *       else kvSet(androidStagingDirUri, directoryUri).
 *    b. readDirectoryAsync(dirUri); deleteAsync every entry whose decodeURIComponent(uri) ends with
 *       '/' + fileName (prevents Android's " (1)" suffix).
 *    c. createFileAsync(dirUri, fileName without '.pdf', 'application/pdf').
 *    d. Read the stored PDF as base64 and StorageAccessFramework.writeAsStringAsync(newUri, b64,
 *       { encoding: 'base64' }).
 *    e. If b–d throw and dirUri came from storage: kvRemove(androidStagingDirUri) and restart from a
 *       exactly once. Second failure → WRITE_FAILED.
 *    fileName = resume.fileName ?? `${resume.label}.pdf`.
 * 4. iOS: copy to new File(Paths.cache, fileName) (overwrite), Sharing.shareAsync(uri,
 *    { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Save resume' });
 *    unavailable → SHARE_UNAVAILABLE; copy failure → WRITE_FAILED; dismissal = success.
 * Never throws.
 */
export async function stageResume(
  resume: Resume,
  coverNote: string,
): Promise<Result<StageResumeOutcome, StageResumeError>> {
  // TODO(T-035): implement per the rules above.
  void resume;
  void coverNote;
  return { ok: false, error: { code: 'NO_FILE', clipboardCopied: false } };
}
