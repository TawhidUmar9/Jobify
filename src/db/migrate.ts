import type { SQLiteDatabase } from 'expo-sqlite';

import { SEED_BOARDS } from '../data/seedBoards';
import { DB_VERSION, MIGRATIONS } from './schema';

/**
 * Passed as `onInit` to <SQLiteProvider>. Runs before any screen renders.
 *
 * Exact behaviour:
 * 0. `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON` (outside any transaction).
 * 1. Read `PRAGMA user_version` (0 on a fresh install).
 * 2. If it is >= DB_VERSION, return.
 * 3. Inside db.withExclusiveTransactionAsync: for v from user_version to DB_VERSION - 1,
 *    run MIGRATIONS[v] with execAsync.
 * 4. If job_boards is empty, insert SEED_BOARDS (parameterised runAsync, last_visited_url NULL).
 *    No other seed data: profile, preferences, resumes and answers start empty (onboarding fills them).
 * 5. Set `PRAGMA user_version = DB_VERSION`.
 * 6. Errors propagate (the root ErrorBoundary shows them).
 * Idempotent.
 */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL');
  await db.execAsync('PRAGMA foreign_keys = ON');

  const versionRow: unknown = await db.getFirstAsync('PRAGMA user_version');
  const version = readUserVersion(versionRow);
  if (version >= DB_VERSION) return;

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (let step = version; step < DB_VERSION; step += 1) {
      const sql = MIGRATIONS[step];
      if (sql !== undefined) await txn.execAsync(sql);
    }

    const countRow: unknown = await txn.getFirstAsync('SELECT COUNT(*) AS n FROM job_boards');
    if (readCount(countRow) === 0) {
      for (const board of SEED_BOARDS) {
        await txn.runAsync(
          'INSERT INTO job_boards (name, url, last_visited_url, sort_order) VALUES (?, ?, NULL, ?)',
          [board.name, board.url, board.sortOrder],
        );
      }
    }

    await txn.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
  });
}

function readUserVersion(row: unknown): number {
  if (typeof row === 'number' && Number.isFinite(row)) return row;
  if (row && typeof row === 'object' && 'user_version' in row) {
    const value = (row as { user_version: unknown }).user_version;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return 0;
}

function readCount(row: unknown): number {
  if (row && typeof row === 'object' && 'n' in row) {
    const value = (row as { n: unknown }).n;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return 0;
}
