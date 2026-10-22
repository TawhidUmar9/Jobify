import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import type { ResumeRow } from '../../schema';
import { deleteResume, insertResume, listResumes, setResumeFile, updateResume } from '../resumesRepo';

function row(partial: Partial<ResumeRow> & Pick<ResumeRow, 'id' | 'label'>): ResumeRow {
  return {
    file_name: null,
    file_uri: null,
    content_json: '{"summary":"S","skills":["Node.js"],"highlights":["Built CI"]}',
    created_at: '2026-10-01 00:00:00',
    ...partial,
  };
}

describe('resumesRepo', () => {
  it('rejects empty and over-long labels and case-insensitive duplicates', async () => {
    const empty = createFakeDb();
    expect((await insertResume(empty.db, { label: '   ', fileName: null, fileUri: null, content: { summary: '', skills: [], highlights: [] } })).ok).toBe(
      false,
    );
    const long = createFakeDb();
    const tooLong = await insertResume(long.db, {
      label: 'x'.repeat(41),
      fileName: null,
      fileUri: null,
      content: { summary: '', skills: [], highlights: [] },
    });
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) expect(tooLong.error).toBe('EMPTY_LABEL');

    const duplicate = createFakeDb();
    duplicate.queue('getFirstAsync', { id: 3 });
    const dup = await insertResume(duplicate.db, {
      label: ' main ',
      fileName: null,
      fileUri: null,
      content: { summary: '', skills: [], highlights: [] },
    });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error).toBe('DUPLICATE_LABEL');
  });

  it('lists in created_at, id order and turns bad content JSON into empty content', async () => {
    const fake = createFakeDb();
    fake.queue('getAllAsync', [
      row({ id: 2, label: 'Main', content_json: 'not-json', created_at: '2026-10-02 00:00:00' }),
      row({ id: 1, label: 'Old', created_at: '2026-10-01 00:00:00' }),
    ]);
    const resumes = await listResumes(fake.db);
    expect(fake.calls[0]?.sql).toContain('ORDER BY created_at ASC, id ASC');
    expect(resumes[0]?.content).toEqual({ summary: '', skills: [], highlights: [] });
    expect(resumes[1]?.content.skills).toEqual(['Node.js']);
  });

  it('updates both file columns', async () => {
    const fake = createFakeDb();
    await setResumeFile(fake.db, 4, 'Alex_Rahman_Backend.pdf', 'file:///resumes/4.pdf');
    expect(fake.calls[0]?.sql).toBe('UPDATE resumes SET file_name = ?, file_uri = ? WHERE id = ?');
    expect(fake.calls[0]?.params).toEqual(['Alex_Rahman_Backend.pdf', 'file:///resumes/4.pdf', 4]);
  });

  it('returns false when a delete changes nothing', async () => {
    const fake = createFakeDb();
    fake.queue('runAsync', { changes: 0, lastInsertRowId: 0 });
    await expect(deleteResume(fake.db, 9)).resolves.toBe(false);
  });

  it('maps a unique constraint failure to DUPLICATE_LABEL on update', async () => {
    const fake = createFakeDb();
    fake.queue('getFirstAsync', row({ id: 1, label: 'Main' }));
    fake.queue('getFirstAsync', null);
    fake.fail('runAsync', new Error('UNIQUE constraint failed: resumes.label'));
    const result = await updateResume(fake.db, 1, { label: 'Other' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('DUPLICATE_LABEL');
  });
});
