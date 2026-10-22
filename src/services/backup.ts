import type { SQLiteDatabase } from 'expo-sqlite';

import type { Result } from '../lib/result';
import type {
  Application,
  CandidateProfile,
  JobBoard,
  JobPreferences,
  ResumeContent,
  SavedAnswer,
} from '../types/domain';

/**
 * Plain-JSON backup (v1 is unencrypted; the export screen warns). CONTRACT: ARCHITECTURE.md §6.6.
 * Never includes the API key or resume PDF files (text content only).
 */

export const BACKUP_FORMAT = 'jobify-backup';
export const BACKUP_VERSION = 1;

export interface BackupFileV1 {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  /** ISO 8601 UTC. */
  exportedAt: string;
  /** app.json expo.version at export time. */
  appVersion: string;
  profile: CandidateProfile | null;
  preferences: JobPreferences;
  resumes: { label: string; fileName: string | null; content: ResumeContent }[];
  boards: Omit<JobBoard, 'id'>[];
  answers: Omit<SavedAnswer, 'id'>[];
  applications: Omit<Application, 'id' | 'resumeId'>[];
}

export type ExportError = 'DB_ERROR' | 'WRITE_FAILED' | 'SHARE_UNAVAILABLE';

/**
 * Builds BackupFileV1 from the DB, writes `${Paths.cache}/jobify-backup-YYYY-MM-DD.json`
 * (2-space JSON), then Sharing.shareAsync(uri, { mimeType: 'application/json' }).
 */
export async function exportBackup(db: SQLiteDatabase): Promise<Result<{ uri: string }, ExportError>> {
  // TODO(T-042): implement.
  void db;
  return { ok: false, error: 'DB_ERROR' };
}

export type ImportError = 'CANCELLED' | 'UNREADABLE' | 'WRONG_FORMAT' | 'NEWER_VERSION' | 'DB_ERROR';

export interface ImportSummary {
  resumes: number;
  boards: number;
  answers: number;
  applications: number;
}

/**
 * Picks a JSON file (DocumentPicker type 'application/json'), validates it, and REPLACES all local
 * data in one transaction: profile, preferences, resumes (text only: fileName kept, fileUri NULL),
 * job_boards, answers, applications (resume_id re-linked by resume label, else NULL).
 * Validation: format/version must match (version > BACKUP_VERSION → NEWER_VERSION); profile and
 * preferences pass through normalizeProfile/normalizePreferences; array items failing type checks
 * are skipped (not fatal). On success sets KV onboardingCompleted = "1".
 * The caller shows a confirmation dialog BEFORE calling (data is replaced).
 */
export async function importBackup(db: SQLiteDatabase): Promise<Result<ImportSummary, ImportError>> {
  // TODO(T-042): implement.
  void db;
  return { ok: false, error: 'CANCELLED' };
}
