import type { SQLiteDatabase } from 'expo-sqlite';

import type { Result } from '../../lib/result';
import type { Application, ApplicationPatch, NewApplication } from '../../types/domain';

export type InsertApplicationError = 'DUPLICATE' | 'DB_ERROR';

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
  // TODO(T-010): implement.
  void db;
  void input;
  return { ok: false, error: 'DB_ERROR' };
}

/** All applications ordered by created_at DESC, id DESC. Rows with unknown enums are skipped. */
export async function listApplications(db: SQLiteDatabase): Promise<Application[]> {
  // TODO(T-010): implement.
  void db;
  return [];
}

export async function getApplication(db: SQLiteDatabase, id: number): Promise<Application | null> {
  // TODO(T-010): implement.
  void db;
  void id;
  return null;
}

/**
 * Applications whose follow_up_at <= now and status in (APPLIED, INTERVIEWING),
 * ordered by follow_up_at ASC.
 */
export async function listFollowUpsDue(db: SQLiteDatabase, now: Date): Promise<Application[]> {
  // TODO(T-010): implement. Pass `now` as a UTC "YYYY-MM-DD HH:MM:SS" parameter.
  void db;
  void now;
  return [];
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
  // TODO(T-034): implement (empty strings stored as NULL).
  void db;
  void jobUrl;
  void text;
}

export async function deleteApplication(db: SQLiteDatabase, id: number): Promise<void> {
  // TODO(T-037): implement.
  void db;
  void id;
}
