import type { SQLiteDatabase } from 'expo-sqlite';

import { logger } from '../../lib/logger';
import { err, ok, type Result } from '../../lib/result';
import {
  APPLICATION_STATUSES,
  ELIGIBILITIES,
  RED_FLAG_CODES,
  type Application,
  type ApplicationPatch,
  type ApplicationStatus,
  type Eligibility,
  type NewApplication,
  type RedFlag,
  type RedFlagCode,
} from '../../types/domain';
import type { ApplicationRow } from '../schema';

export type InsertApplicationError = 'DUPLICATE' | 'DB_ERROR';

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && error.message.toLowerCase().includes('unique');
}

function isStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

function isEligibility(value: string): value is Eligibility {
  return (ELIGIBILITIES as readonly string[]).includes(value);
}

function isRedFlagCode(value: string): value is RedFlagCode {
  return (RED_FLAG_CODES as readonly string[]).includes(value);
}

function clampScore(score: number | null): number | null {
  if (score === null) return null;
  const rounded = Math.round(score);
  if (!Number.isFinite(rounded)) return 0;
  return Math.min(100, Math.max(0, rounded));
}

function parseRedFlags(raw: string): RedFlag[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const flags: RedFlag[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const record = item as Record<string, unknown>;
      if (typeof record.code !== 'string' || !isRedFlagCode(record.code)) continue;
      if (typeof record.detail !== 'string') continue;
      flags.push({ code: record.code, detail: record.detail });
    }
    return flags;
  } catch {
    return [];
  }
}

function mapApplication(row: ApplicationRow): Application | null {
  if (!isStatus(row.status)) return null;
  if (row.eligibility !== null && !isEligibility(row.eligibility)) return null;
  return {
    id: row.id,
    companyName: row.company_name,
    roleTitle: row.role_title,
    boardName: row.board_name,
    jobUrl: row.job_url,
    resumeId: row.resume_id,
    resumeLabel: row.resume_label,
    matchScore: row.match_score,
    eligibility: row.eligibility,
    redFlags: parseRedFlags(row.red_flags_json),
    coverNote: row.cover_note,
    coldDm: row.cold_dm,
    notes: row.notes,
    status: row.status,
    followUpAt: row.follow_up_at,
    createdAt: row.created_at,
    statusChangedAt: row.status_changed_at,
  };
}

function formatUtcTimestamp(now: Date): string {
  return now.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Inserts an application.
 * - Same job_url already stored → err('DUPLICATE') (UNIQUE index; check first, also catch the constraint).
 * - matchScore rounded + clamped 0–100; null stays null. redFlags stored as JSON.
 * - status defaults to 'APPLIED'. follow_up_at = now + DEFAULT_FOLLOW_UP_DAYS days when status is
 *   APPLIED, else NULL (SQL: datetime('now', '+7 days')).
 * - Other exceptions → err('DB_ERROR') (logger.error with the code only).
 * - Returns the stored row.
 */
export async function insertApplication(
  db: SQLiteDatabase,
  input: NewApplication,
): Promise<Result<Application, InsertApplicationError>> {
  const existing = await db.getFirstAsync<{ id: number }>('SELECT id FROM applications WHERE job_url = ?', [
    input.jobUrl,
  ]);
  if (existing) return err('DUPLICATE');
  const status = input.status ?? 'APPLIED';
  const matchScore = clampScore(input.matchScore);
  try {
    const inserted = await db.runAsync(
      `INSERT INTO applications (
        company_name, role_title, board_name, job_url, resume_id, resume_label,
        match_score, eligibility, red_flags_json, cover_note, cold_dm, notes, status, follow_up_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, CASE WHEN ? = 'APPLIED' THEN datetime('now', '+7 days') ELSE NULL END)`,
      [
        input.companyName,
        input.roleTitle,
        input.boardName,
        input.jobUrl,
        input.resumeId,
        input.resumeLabel,
        matchScore,
        input.eligibility,
        JSON.stringify(input.redFlags),
        input.coverNote,
        input.coldDm,
        status,
        status,
      ],
    );
    const stored = await getApplication(db, inserted.lastInsertRowId);
    if (!stored) return err('DB_ERROR');
    return ok(stored);
  } catch (error) {
    if (isUniqueViolation(error)) return err('DUPLICATE');
    logger.error('applications', 'DB_ERROR');
    return err('DB_ERROR');
  }
}

/** All applications ordered by created_at DESC, id DESC. Rows with unknown enums are skipped. */
export async function listApplications(db: SQLiteDatabase): Promise<Application[]> {
  const rows = await db.getAllAsync<ApplicationRow>(
    'SELECT * FROM applications ORDER BY created_at DESC, id DESC',
  );
  const applications: Application[] = [];
  for (const row of rows) {
    const mapped = mapApplication(row);
    if (mapped) applications.push(mapped);
  }
  return applications;
}

export async function getApplication(db: SQLiteDatabase, id: number): Promise<Application | null> {
  const row = await db.getFirstAsync<ApplicationRow>('SELECT * FROM applications WHERE id = ?', [id]);
  return row ? mapApplication(row) : null;
}

/**
 * Applications whose follow_up_at <= now and status in (APPLIED, INTERVIEWING),
 * ordered by follow_up_at ASC.
 */
export async function listFollowUpsDue(db: SQLiteDatabase, now: Date): Promise<Application[]> {
  const rows = await db.getAllAsync<ApplicationRow>(
    `SELECT * FROM applications
     WHERE follow_up_at IS NOT NULL AND follow_up_at <= ?
       AND status IN ('APPLIED', 'INTERVIEWING')
     ORDER BY follow_up_at ASC`,
    [formatUtcTimestamp(now)],
  );
  const applications: Application[] = [];
  for (const row of rows) {
    const mapped = mapApplication(row);
    if (mapped) applications.push(mapped);
  }
  return applications;
}

/**
 * Applies a patch. status change → also sets status_changed_at = CURRENT_TIMESTAMP, and when the new
 * status is OFFER, REJECTED or WITHDRAWN sets follow_up_at = NULL (unless the patch sets it).
 * notes max 5000 chars (truncate). Returns the updated row or null if the id does not exist.
 */
export async function patchApplication(
  db: SQLiteDatabase,
  id: number,
  patch: ApplicationPatch,
): Promise<Application | null> {
  // TODO(T-037): implement.
  void db;
  void id;
  void patch;
  return null;
}

/** Sets cover_note / cold_dm after tailoring an already-logged job (same job_url). */
export async function attachTailorText(
  db: SQLiteDatabase,
  jobUrl: string,
  text: { coverNote: string; coldDm: string },
): Promise<void> {
  const coverNote = text.coverNote.trim() === "" ? null : text.coverNote;
  const coldDm = text.coldDm.trim() === "" ? null : text.coldDm;
  await db.runAsync("UPDATE applications SET cover_note = ?, cold_dm = ? WHERE job_url = ?", [
    coverNote,
    coldDm,
    jobUrl,
  ]);
}

export async function deleteApplication(db: SQLiteDatabase, id: number): Promise<void> {
  // TODO(T-037): implement.
  void db;
  void id;
}
