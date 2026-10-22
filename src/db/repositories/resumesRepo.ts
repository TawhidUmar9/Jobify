import type { SQLiteDatabase } from 'expo-sqlite';

import { err, ok, type Result } from '../../lib/result';
import type { Resume, ResumeContent } from '../../types/domain';
import type { ResumeRow } from '../schema';

export type ResumeWriteError = 'DUPLICATE_LABEL' | 'EMPTY_LABEL' | 'DB_ERROR';

function emptyContent(): ResumeContent {
  return { summary: '', skills: [], highlights: [] };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes('unique');
}

function parseContent(raw: string): ResumeContent {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyContent();
    const record = parsed as Record<string, unknown>;
    return {
      summary: typeof record.summary === 'string' ? record.summary : '',
      skills: Array.isArray(record.skills) ? record.skills.filter((item): item is string => typeof item === 'string') : [],
      highlights: Array.isArray(record.highlights)
        ? record.highlights.filter((item): item is string => typeof item === 'string')
        : [],
    };
  } catch {
    return emptyContent();
  }
}

function mapResume(row: ResumeRow): Resume {
  return {
    id: row.id,
    label: row.label,
    fileName: row.file_name,
    fileUri: row.file_uri,
    content: parseContent(row.content_json),
    createdAt: row.created_at,
  };
}

function validateLabel(label: string): Result<string, 'EMPTY_LABEL'> {
  const trimmed = label.trim();
  if (trimmed.length < 1 || trimmed.length > 40) return err('EMPTY_LABEL');
  return ok(trimmed);
}

async function findLabelId(db: SQLiteDatabase, label: string): Promise<number | null> {
  const row = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM resumes WHERE label = ? COLLATE NOCASE',
    [label],
  );
  return row && typeof row.id === 'number' ? row.id : null;
}

/** All resumes ordered by created_at ASC, id ASC. content_json parsed; bad JSON → empty content. */
export async function listResumes(db: SQLiteDatabase): Promise<Resume[]> {
  const rows = await db.getAllAsync<ResumeRow>('SELECT * FROM resumes ORDER BY created_at ASC, id ASC');
  return rows.map(mapResume);
}

export async function getResume(db: SQLiteDatabase, id: number): Promise<Resume | null> {
  const row = await db.getFirstAsync<ResumeRow>('SELECT * FROM resumes WHERE id = ?', [id]);
  return row ? mapResume(row) : null;
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
  const label = validateLabel(input.label);
  if (!label.ok) return label;
  const taken = await findLabelId(db, label.value);
  if (taken !== null) return err('DUPLICATE_LABEL');
  try {
    const result = await db.runAsync(
      'INSERT INTO resumes (label, file_name, file_uri, content_json) VALUES (?, ?, ?, ?)',
      [label.value, input.fileName, input.fileUri, JSON.stringify(input.content)],
    );
    const stored = await getResume(db, result.lastInsertRowId);
    if (!stored) return err('DB_ERROR');
    return ok(stored);
  } catch (error) {
    if (isUniqueViolation(error)) return err('DUPLICATE_LABEL');
    return err('DB_ERROR');
  }
}

/** Updates label and/or content (same label rules). */
export async function updateResume(
  db: SQLiteDatabase,
  id: number,
  patch: { label?: string; content?: ResumeContent },
): Promise<Result<Resume, ResumeWriteError>> {
  const current = await getResume(db, id);
  if (!current) return err('DB_ERROR');
  let label = current.label;
  if (patch.label !== undefined) {
    const checked = validateLabel(patch.label);
    if (!checked.ok) return checked;
    const taken = await findLabelId(db, checked.value);
    if (taken !== null && taken !== id) return err('DUPLICATE_LABEL');
    label = checked.value;
  }
  const content = patch.content ?? current.content;
  try {
    await db.runAsync('UPDATE resumes SET label = ?, content_json = ? WHERE id = ?', [
      label,
      JSON.stringify(content),
      id,
    ]);
  } catch (error) {
    if (isUniqueViolation(error)) return err('DUPLICATE_LABEL');
    return err('DB_ERROR');
  }
  return ok({ ...current, label, content });
}

/** Sets file_name and file_uri after the PDF was copied into app storage. */
export async function setResumeFile(db: SQLiteDatabase, id: number, fileName: string, fileUri: string): Promise<void> {
  await db.runAsync('UPDATE resumes SET file_name = ?, file_uri = ? WHERE id = ?', [fileName, fileUri, id]);
}

/** Deletes the row (applications.resume_id becomes NULL via FK). The caller deletes the file. */
export async function deleteResume(db: SQLiteDatabase, id: number): Promise<boolean> {
  const result = await db.runAsync('DELETE FROM resumes WHERE id = ?', [id]);
  return result.changes > 0;
}
