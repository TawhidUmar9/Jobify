import { SEED_BOARDS } from '../../data/seedBoards';
import { createFakeDb } from '../../../tests/helpers/fakeDb';
import { migrateDbIfNeeded } from '../migrate';
import { MIGRATION_V1 } from '../schema';

describe('migrateDbIfNeeded', () => {
  it('runs MIGRATION_V1, inserts 8 boards, and sets user_version on a fresh database', async () => {
    const fake = createFakeDb();
    fake.queue('getFirstAsync', { user_version: 0 });
    fake.queue('getFirstAsync', { n: 0 });

    await migrateDbIfNeeded(fake.db);

    const sql = fake.calls.map((call) => call.sql);
    expect(sql[0]).toBe('PRAGMA journal_mode = WAL');
    expect(sql[1]).toBe('PRAGMA foreign_keys = ON');
    expect(fake.calls.some((call) => call.method === 'execAsync' && call.sql === MIGRATION_V1)).toBe(true);

    const inserts = fake.calls.filter((call) => call.method === 'runAsync');
    expect(inserts).toHaveLength(8);
    expect(inserts.map((call) => call.params)).toEqual(
      SEED_BOARDS.map((board) => [board.name, board.url, board.sortOrder]),
    );
    for (const insert of inserts) {
      expect(insert.sql).toContain('?');
      expect(insert.sql).toContain('last_visited_url');
    }

    const versionWrite = fake.calls.findIndex((call) => call.sql === 'PRAGMA user_version = 1');
    const migration = fake.calls.findIndex((call) => call.sql === MIGRATION_V1);
    expect(versionWrite).toBeGreaterThan(migration);
  });

  it('does not migrate or seed when user_version is already 1', async () => {
    const fake = createFakeDb();
    fake.queue('getFirstAsync', { user_version: 1 });

    await migrateDbIfNeeded(fake.db);

    expect(fake.calls.map((call) => call.sql)).toEqual([
      'PRAGMA journal_mode = WAL',
      'PRAGMA foreign_keys = ON',
      'PRAGMA user_version',
    ]);
    expect(fake.calls.some((call) => call.sql === MIGRATION_V1)).toBe(false);
    expect(fake.calls.some((call) => call.method === 'runAsync')).toBe(false);
  });
});
