import type { SQLiteDatabase } from 'expo-sqlite';

import type { Result } from '../../lib/result';
import type { Resume, ResumeContent } from '../../types/domain';

export type ResumeWriteError = 'DUPLICATE_LABEL' | 'EMPTY_LABEL' | 'DB_ERROR';

/** All resumes ordered by created_at ASC, id ASC. content_json parsed; bad JSON → empty content. */
export async function listResumes(db: SQLiteDatabase): Promise<Resume[]> {
  // TODO(T-007): implement.
  void db;
  return [];
}

export async function getResume(db: SQLiteDatabase, id: number): Promise<Resume | null> {
  // TODO(T-007): implement.
  void db;
  void id;
  return null;
}

/**
 * Inserts a resume. label trimmed, 1–40 chars (else EMPTY_LABEL); a case-insensitive duplicate →
 * DUPLICATE_LABEL. fileName/fileUri may be null (text-only resume). Returns the stored row.
 * For PDFs the caller inserts first, copies the file, then calls setResumeFile.
 */
export async function insertResume(
  db: SQLiteDatabase,
  input: { label: string; fileName: string | null; fileUri: string | null; content: ResumeContent },
): Promise<Result<Resume, ResumeWriteError>> {
  // TODO(T-007): implement.
  void db;
  void input;
  return { ok: false, error: 'DB_ERROR' };
}

/** Updates label and/or content (same label rules). */
export async function updateResume(
  db: SQLiteDatabase,
  id: number,
  patch: { label?: string; content?: ResumeContent },
): Promise<Result<Resume, ResumeWriteError>> {
  // TODO(T-007): implement.
  void db;
  void id;
  void patch;
  return { ok: false, error: 'DB_ERROR' };
}

/** Sets file_name and file_uri after the PDF was copied into app storage. */
export async function setResumeFile(db: SQLiteDatabase, id: number, fileName: string, fileUri: string): Promise<void> {
  // TODO(T-007): implement.
  void db;
  void id;
  void fileName;
  void fileUri;
}

/** Deletes the row (applications.resume_id becomes NULL via FK). The caller deletes the file. */
export async function deleteResume(db: SQLiteDatabase, id: number): Promise<boolean> {
  // TODO(T-007): implement.
  void db;
  void id;
  return false;
}
