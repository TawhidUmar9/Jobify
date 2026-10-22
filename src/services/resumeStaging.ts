import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { err, ok, type Result } from '../lib/result';
import type { Resume } from '../types/domain';
import { KV_KEYS, kvGet, kvRemove, kvSet } from './kvStore';

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
  let clipboardCopied = false;
  if (coverNote && coverNote.length > 0) {
    try {
      await Clipboard.setStringAsync(coverNote);
      clipboardCopied = true;
    } catch {
      clipboardCopied = false;
    }
  }

  if (!resume.fileUri) {
    return err({ code: 'NO_FILE', clipboardCopied });
  }

  const sourceFile = new File(resume.fileUri);
  if (!sourceFile.exists) {
    return err({ code: 'FILE_MISSING', clipboardCopied });
  }

  const fileName =
    resume.fileName && resume.fileName.trim().length > 0
      ? resume.fileName
      : `${resume.label}.pdf`;

  if (Platform.OS === 'android') {
    let dirUri = await kvGet(KV_KEYS.androidStagingDirUri);
    let isFromStorage = dirUri !== null;

    const requestDir = async (): Promise<string | null> => {
      const initialRoot = StorageAccessFramework.getUriForDirectoryInRoot('Download');
      const perm = await StorageAccessFramework.requestDirectoryPermissionsAsync(initialRoot);
      if (!perm.granted || !perm.directoryUri) {
        return null;
      }
      await kvSet(KV_KEYS.androidStagingDirUri, perm.directoryUri);
      return perm.directoryUri;
    };

    if (!dirUri) {
      dirUri = await requestDir();
      if (!dirUri) {
        return err({ code: 'PERMISSION_DENIED', clipboardCopied });
      }
      isFromStorage = false;
    }

    const baseName = fileName.toLowerCase().endsWith('.pdf')
      ? fileName.slice(0, -4)
      : fileName;

    const tryWrite = async (targetDirUri: string): Promise<string> => {
      const files = await StorageAccessFramework.readDirectoryAsync(targetDirUri);
      for (const fUri of files) {
        const decoded = decodeURIComponent(fUri);
        if (decoded.endsWith('/' + fileName)) {
          await StorageAccessFramework.deleteAsync(fUri);
        }
      }
      const newUri = await StorageAccessFramework.createFileAsync(
        targetDirUri,
        baseName,
        'application/pdf',
      );
      const b64 = await sourceFile.base64();
      await StorageAccessFramework.writeAsStringAsync(newUri, b64, { encoding: 'base64' });
      return newUri;
    };

    try {
      const destinationUri = await tryWrite(dirUri);
      return ok({ platform: 'android', destinationUri, clipboardCopied });
    } catch {
      if (isFromStorage) {
        try {
          await kvRemove(KV_KEYS.androidStagingDirUri);
          dirUri = await requestDir();
          if (!dirUri) {
            return err({ code: 'PERMISSION_DENIED', clipboardCopied });
          }
          const destinationUri = await tryWrite(dirUri);
          return ok({ platform: 'android', destinationUri, clipboardCopied });
        } catch {
          return err({ code: 'WRITE_FAILED', clipboardCopied });
        }
      } else {
        return err({ code: 'WRITE_FAILED', clipboardCopied });
      }
    }
  } else {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        return err({ code: 'SHARE_UNAVAILABLE', clipboardCopied });
      }
      const destFile = new File(Paths.cache, fileName);
      await sourceFile.copy(destFile);
      await Sharing.shareAsync(destFile.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Save resume',
      });
      return ok({ platform: 'ios', clipboardCopied });
    } catch {
      return err({ code: 'WRITE_FAILED', clipboardCopied });
    }
  }
}
