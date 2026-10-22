import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import type { JobBoardRow } from '../../schema';
import { addBoard, deleteBoard, reorderBoards, updateBoard, updateLastVisitedUrl } from '../boardsRepo';

function board(partial: Partial<JobBoardRow> & Pick<JobBoardRow, 'id'>): JobBoardRow {
  return {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/jobs/',
    last_visited_url: 'https://www.linkedin.com/jobs/view/1',
    sort_order: 0,
    ...partial,
  };
}

describe('boardsRepo', () => {
  it('requires a name of 1–16 characters', async () => {
    const blank = await addBoard(createFakeDb().db, { name: '  ', url: 'https://example.com' });
    expect(blank.ok).toBe(false);
    if (!blank.ok) expect(blank.error).toBe('INVALID_NAME');
    const long = await addBoard(createFakeDb().db, { name: 'x'.repeat(17), url: 'https://example.com' });
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.error).toBe('INVALID_NAME');
  });

  it('allows https and selected http hosts, and rejects other http URLs', async () => {
    const allowed = [
      'https://wellfound.com/jobs',
      'http://10.0.2.2:8787/fixtures/job.html',
      'http://localhost:8787/x',
      'http://10.1.2.3/jobs',
      'http://192.168.1.20/',
      'http://172.16.0.1/',
      'http://172.31.255.255/a',
    ];
    for (const url of allowed) {
      const fake = createFakeDb();
      fake.queue('getFirstAsync', { max_order: 2 });
      fake.queue('runAsync', { changes: 1, lastInsertRowId: 9 });
      const result = await addBoard(fake.db, { name: ' Board ', url });
      expect(result.ok).toBe(true);
    }
    const rejected = ['http://example.com', 'http://127.0.0.1', 'http://172.15.0.1', 'javascript:alert(1)', 'not a url'];
    for (const url of rejected) {
      const result = await addBoard(createFakeDb().db, { name: 'Board', url });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe('INVALID_URL');
    }
  });

  it('clears last_visited_url only when the URL changes', async () => {
    const changed = createFakeDb();
    changed.queue('getFirstAsync', board({ id: 1, url: 'https://old.example' }));
    const updated = await updateBoard(changed.db, 1, { name: 'Wellfound', url: 'https://wellfound.com/jobs' });
    expect(updated.ok).toBe(true);
    if (updated.ok) expect(updated.value.lastVisitedUrl).toBeNull();
    expect(changed.calls.find((call) => call.method === 'runAsync')?.params[2]).toBeNull();

    const same = createFakeDb();
    same.queue('getFirstAsync', board({ id: 1 }));
    const kept = await updateBoard(same.db, 1, { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs/' });
    expect(kept.ok).toBe(true);
    if (kept.ok) expect(kept.value.lastVisitedUrl).toBe('https://www.linkedin.com/jobs/view/1');
  });

  it('renumbers sort_order from 0 in one transaction on delete', async () => {
    const fake = createFakeDb();
    fake.queue('getAllAsync', [{ id: 4 }, { id: 2 }]);
    await deleteBoard(fake.db, 1);
    const updates = fake.calls.filter((call) => call.method === 'runAsync' && call.sql.startsWith('UPDATE'));
    expect(updates.map((call) => call.params)).toEqual([
      [0, 4],
      [1, 2],
    ]);
  });

  it('reorders in one transaction when every id is present', async () => {
    const fake = createFakeDb();
    fake.queue('getAllAsync', [{ id: 1 }, { id: 2 }, { id: 3 }]);
    await reorderBoards(fake.db, [3, 1, 2]);
    const updates = fake.calls.filter((call) => call.method === 'runAsync');
    expect(updates.map((call) => call.params)).toEqual([
      [0, 3],
      [1, 1],
      [2, 2],
    ]);

    const incomplete = createFakeDb();
    incomplete.queue('getAllAsync', [{ id: 1 }, { id: 2 }]);
    await reorderBoards(incomplete.db, [1]);
    expect(incomplete.calls.some((call) => call.method === 'runAsync')).toBe(false);
  });

  it('updates last_visited_url directly', async () => {
    const fake = createFakeDb();
    await updateLastVisitedUrl(fake.db, 5, 'https://example.com/page');
    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0].sql).toContain('UPDATE job_boards SET last_visited_url = ? WHERE id = ?');
    expect(fake.calls[0].params).toEqual(['https://example.com/page', 5]);
  });
});
