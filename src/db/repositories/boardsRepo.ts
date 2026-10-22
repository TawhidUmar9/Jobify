import type { SQLiteDatabase } from 'expo-sqlite';

import { isHttpUrl } from '../../lib/url';
import { err, ok, type Result } from '../../lib/result';
import type { JobBoard } from '../../types/domain';
import type { JobBoardRow } from '../schema';

export type BoardWriteError = 'INVALID_NAME' | 'INVALID_URL' | 'DB_ERROR';

function mapBoard(row: JobBoardRow): JobBoard {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    lastVisitedUrl: row.last_visited_url,
    sortOrder: row.sort_order,
  };
}

function validateName(name: string): Result<string, 'INVALID_NAME'> {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 16) return err('INVALID_NAME');
  return ok(trimmed);
}

function isPrivateLanHost(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4) return false;
  const numbers = parts.map((part) => Number(part));
  if (numbers.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return false;
  const a = numbers[0];
  const b = numbers[1];
  if (a === undefined || b === undefined) return false;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

/** https, or http only for 10.0.2.2, localhost, and private LAN addresses. */
function isAllowedBoardUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!isHttpUrl(trimmed)) return false;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  if (parsed.protocol === 'https:') return true;
  if (parsed.protocol !== 'http:') return false;
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '10.0.2.2') return true;
  return isPrivateLanHost(host);
}

function validateUrl(url: string): Result<string, 'INVALID_URL'> {
  const trimmed = url.trim();
  if (!isAllowedBoardUrl(trimmed)) return err('INVALID_URL');
  return ok(trimmed);
}

/** All boards ordered by sort_order ASC, id ASC. */
export async function listBoards(db: SQLiteDatabase): Promise<JobBoard[]> {
  const rows = await db.getAllAsync<JobBoardRow>('SELECT * FROM job_boards ORDER BY sort_order ASC, id ASC');
  return rows.map(mapBoard);
}

/**
 * Appends a board (sort_order = max + 1). name trimmed 1–16 chars else INVALID_NAME;
 * url must pass isHttpUrl and use https (http allowed only for 10.0.2.2, localhost, or private
 * LAN IPs) else INVALID_URL.
 */
export async function addBoard(
  db: SQLiteDatabase,
  input: { name: string; url: string },
): Promise<Result<JobBoard, BoardWriteError>> {
  const name = validateName(input.name);
  if (!name.ok) return name;
  const url = validateUrl(input.url);
  if (!url.ok) return url;
  try {
    const maxRow = await db.getFirstAsync<{ max_order: number | null }>(
      'SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM job_boards',
    );
    const maxOrder = maxRow && typeof maxRow.max_order === 'number' ? maxRow.max_order : -1;
    const sortOrder = maxOrder + 1;
    const inserted = await db.runAsync(
      'INSERT INTO job_boards (name, url, last_visited_url, sort_order) VALUES (?, ?, NULL, ?)',
      [name.value, url.value, sortOrder],
    );
    return ok({
      id: inserted.lastInsertRowId,
      name: name.value,
      url: url.value,
      lastVisitedUrl: null,
      sortOrder,
    });
  } catch {
    return err('DB_ERROR');
  }
}

/** Same validation as addBoard. Changing url clears last_visited_url. */
export async function updateBoard(
  db: SQLiteDatabase,
  id: number,
  input: { name: string; url: string },
): Promise<Result<JobBoard, BoardWriteError>> {
  const name = validateName(input.name);
  if (!name.ok) return name;
  const url = validateUrl(input.url);
  if (!url.ok) return url;
  const current = await db.getFirstAsync<JobBoardRow>('SELECT * FROM job_boards WHERE id = ?', [id]);
  if (!current) return err('DB_ERROR');
  const urlChanged = current.url !== url.value;
  try {
    await db.runAsync(
      'UPDATE job_boards SET name = ?, url = ?, last_visited_url = ? WHERE id = ?',
      [name.value, url.value, urlChanged ? null : current.last_visited_url, id],
    );
  } catch {
    return err('DB_ERROR');
  }
  return ok({
    id,
    name: name.value,
    url: url.value,
    lastVisitedUrl: urlChanged ? null : current.last_visited_url,
    sortOrder: current.sort_order,
  });
}

/** Deletes and re-numbers sort_order contiguously from 0. */
export async function deleteBoard(db: SQLiteDatabase, id: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM job_boards WHERE id = ?', [id]);
    const remaining = await db.getAllAsync<{ id: number }>(
      'SELECT id FROM job_boards ORDER BY sort_order ASC, id ASC',
    );
    for (let index = 0; index < remaining.length; index += 1) {
      const board = remaining[index];
      if (!board) continue;
      await db.runAsync('UPDATE job_boards SET sort_order = ? WHERE id = ?', [index, board.id]);
    }
  });
}

/** Sets sort_order = index for each id in `orderedIds` (all ids must be present) in one transaction. */
export async function reorderBoards(db: SQLiteDatabase, orderedIds: readonly number[]): Promise<void> {
  await db.withTransactionAsync(async () => {
    const rows = await db.getAllAsync<{ id: number }>('SELECT id FROM job_boards');
    const known = new Set(rows.map((row) => row.id));
    if (known.size !== orderedIds.length || orderedIds.some((id) => !known.has(id))) return;
    for (let index = 0; index < orderedIds.length; index += 1) {
      await db.runAsync('UPDATE job_boards SET sort_order = ? WHERE id = ?', [index, orderedIds[index]]);
    }
  });
}

/** Sets last_visited_url. Resolves even if the id does not exist. */
export async function updateLastVisitedUrl(db: SQLiteDatabase, id: number, url: string): Promise<void> {
  // TODO(T-045): implement.
  void db;
  void id;
  void url;
}
