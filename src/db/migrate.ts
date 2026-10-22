import type { SQLiteDatabase } from 'expo-sqlite';

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
  // TODO(T-004): implement per the rules above.
  void db;
}
