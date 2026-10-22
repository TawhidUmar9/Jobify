import type { SQLiteDatabase } from 'expo-sqlite';

import type { Result } from '../../lib/result';
import type { JobBoard } from '../../types/domain';

export type BoardWriteError = 'INVALID_NAME' | 'INVALID_URL' | 'DB_ERROR';

/** All boards ordered by sort_order ASC, id ASC. */
export async function listBoards(db: SQLiteDatabase): Promise<JobBoard[]> {
  // TODO(T-008): implement.
  void db;
  return [];
}

/**
 * Appends a board (sort_order = max + 1). name trimmed 1–16 chars else INVALID_NAME;
 * url must pass isHttpUrl and use https (http allowed only for 10.0.2.2, localhost, or private
 * LAN IPs) else INVALID_URL.
 */
export async function addBoard(db: SQLiteDatabase, input: { name: string; url: string }): Promise<Result<JobBoard, BoardWriteError>> {
  // TODO(T-008): implement.
  void db;
  void input;
  return { ok: false, error: 'DB_ERROR' };
}

/** Same validation as addBoard. Changing url clears last_visited_url. */
export async function updateBoard(
  db: SQLiteDatabase,
  id: number,
  input: { name: string; url: string },
): Promise<Result<JobBoard, BoardWriteError>> {
  // TODO(T-008): implement.
  void db;
  void id;
  void input;
  return { ok: false, error: 'DB_ERROR' };
}

/** Deletes and re-numbers sort_order contiguously from 0. */
export async function deleteBoard(db: SQLiteDatabase, id: number): Promise<void> {
  // TODO(T-008): implement in one transaction.
  void db;
  void id;
}

/** Sets sort_order = index for each id in `orderedIds` (all ids must be present) in one transaction. */
export async function reorderBoards(db: SQLiteDatabase, orderedIds: readonly number[]): Promise<void> {
  // TODO(T-008): implement.
  void db;
  void orderedIds;
}

/** Sets last_visited_url. Resolves even if the id does not exist. */
export async function updateLastVisitedUrl(db: SQLiteDatabase, id: number, url: string): Promise<void> {
  // TODO(T-045): implement.
  void db;
  void id;
  void url;
}
