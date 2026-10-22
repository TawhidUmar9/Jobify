/**
 * Minimal SQLiteDatabase fake for repository/hook tests. It records SQL and returns
 * queued results. Tests that need real SQL semantics should instead run the repository
 * against a real SQLite engine on the device (E2E). Architect-owned helper; extend, don't fork.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

export interface FakeDbCall {
  method: 'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync';
  sql: string;
  params: unknown[];
}

export interface FakeDb {
  db: SQLiteDatabase;
  calls: FakeDbCall[];
  /** Queue the next return value for a method (FIFO). Default: getFirst→null, getAll→[], run→{changes:0,lastInsertRowId:0}. */
  queue: (method: FakeDbCall['method'], value: unknown) => void;
  /** Make the next call to `method` throw `error`. */
  fail: (method: FakeDbCall['method'], error?: Error) => void;
}

export function createFakeDb(): FakeDb {
  const calls: FakeDbCall[] = [];
  const queues: Record<string, unknown[]> = { execAsync: [], runAsync: [], getFirstAsync: [], getAllAsync: [] };
  const failures: Record<string, Error[]> = { execAsync: [], runAsync: [], getFirstAsync: [], getAllAsync: [] };
  const defaults: Record<string, () => unknown> = {
    execAsync: () => undefined,
    runAsync: () => ({ changes: 0, lastInsertRowId: 0 }),
    getFirstAsync: () => null,
    getAllAsync: () => [],
  };
  const make =
    (method: FakeDbCall['method']) =>
    async (sql: string, ...rest: unknown[]) => {
      const params = rest.length === 1 && Array.isArray(rest[0]) ? (rest[0] as unknown[]) : rest;
      calls.push({ method, sql, params });
      const failure = failures[method].shift();
      if (failure) throw failure;
      return queues[method].length ? queues[method].shift() : defaults[method]();
    };
  const db = {
    execAsync: make('execAsync'),
    runAsync: make('runAsync'),
    getFirstAsync: make('getFirstAsync'),
    getAllAsync: make('getAllAsync'),
    withExclusiveTransactionAsync: async (fn: (txn: unknown) => Promise<void>) => fn(db),
    withTransactionAsync: async (fn: () => Promise<void>) => fn(),
  } as unknown as SQLiteDatabase;
  return {
    db,
    calls,
    queue: (method, value) => void queues[method].push(value),
    fail: (method, error = new Error('fake db failure')) => void failures[method].push(error),
  };
}
