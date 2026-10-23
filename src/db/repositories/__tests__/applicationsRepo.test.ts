import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { logger } from '../../../lib/logger';
import type { NewApplication } from '../../../types/domain';
import type { ApplicationRow } from '../../schema';
import {
  attachTailorText,
  deleteApplication,
  findApplicationByUrl,
  insertApplication,
  listApplications,
  listFollowUpsDue,
  patchApplication,
} from '../applicationsRepo';

function draft(partial: Partial<NewApplication> = {}): NewApplication {
  return {
    companyName: 'Northwind',
    roleTitle: 'Backend engineer',
    boardName: 'Wellfound',
    jobUrl: 'https://example.com/jobs/1',
    resumeId: 1,
    resumeLabel: 'Main',
    matchScore: 80,
    eligibility: 'ELIGIBLE',
    redFlags: [{ code: 'NO_SALARY_INFO', detail: 'No pay listed.' }],
    coverNote: null,
    coldDm: null,
    ...partial,
  };
}

function stored(partial: Partial<ApplicationRow> = {}): ApplicationRow {
  return {
    id: 5,
    company_name: 'Northwind',
    role_title: 'Backend engineer',
    board_name: 'Wellfound',
    job_url: 'https://example.com/jobs/1',
    resume_id: 1,
    resume_label: 'Main',
    match_score: 100,
    eligibility: 'ELIGIBLE',
    red_flags_json: '[{"code":"NO_SALARY_INFO","detail":"No pay listed."}]',
    cover_note: null,
    cold_dm: null,
    notes: '',
    status: 'APPLIED',
    follow_up_at: '2026-10-29 00:00:00',
    created_at: '2026-10-22 00:00:00',
    status_changed_at: '2026-10-22 00:00:00',
    ...partial,
  };
}

describe('applicationsRepo', () => {
  it('maps a pre-check and a UNIQUE violation to DUPLICATE', async () => {
    const pre = createFakeDb();
    pre.queue('getFirstAsync', { id: 1, status: 'APPLIED' });
    const existing = await insertApplication(pre.db, draft());
    expect(existing.ok).toBe(false);
    if (!existing.ok) expect(existing.error).toBe('DUPLICATE');
    expect(pre.calls.some((call) => call.method === 'runAsync')).toBe(false);

    const unique = createFakeDb();
    unique.queue('getFirstAsync', null);
    unique.fail('runAsync', new Error('UNIQUE constraint failed: applications.job_url'));
    const raced = await insertApplication(unique.db, draft());
    expect(raced.ok).toBe(false);
    if (!raced.ok) expect(raced.error).toBe('DUPLICATE');
  });

  it('promotes a SAVED application to APPLIED keeping notes and created_at (D-009)', async () => {
    const fake = createFakeDb();
    fake.queue('getFirstAsync', { id: 10, status: 'SAVED' });
    fake.queue('runAsync', { changes: 1 });
    fake.queue(
      'getFirstAsync',
      stored({
        id: 10,
        notes: 'User note that must stay',
        created_at: '2026-10-01 10:00:00',
        status: 'APPLIED',
      }),
    );

    const result = await insertApplication(
      fake.db,
      draft({ companyName: 'Promoted Corp', roleTitle: 'Senior Lead' }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe(10);
      expect(result.value.notes).toBe('User note that must stay');
      expect(result.value.createdAt).toBe('2026-10-01 10:00:00');
      expect(result.value.status).toBe('APPLIED');
    }

    const updateCall = fake.calls.find((c) => c.method === 'runAsync');
    expect(updateCall).toBeDefined();
    expect(updateCall?.sql).toContain('UPDATE applications SET');
    expect(updateCall?.sql).not.toContain('notes =');
    expect(updateCall?.sql).not.toContain('created_at =');
    expect(updateCall?.sql).toContain("datetime('now', '+7 days')");
    expect(updateCall?.params).toContain('Promoted Corp');
    expect(updateCall?.params).toContain('Senior Lead');
    expect(updateCall?.params).toContain(10);
  });

  it('returns DUPLICATE when existing status is SAVED and input status is SAVED (D-009)', async () => {
    const fake = createFakeDb();
    fake.queue('getFirstAsync', { id: 10, status: 'SAVED' });
    const result = await insertApplication(fake.db, draft({ status: 'SAVED' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('DUPLICATE');
    expect(fake.calls.some((c) => c.method === 'runAsync')).toBe(false);
  });

  it('finds an application by its job URL or returns null (D-009)', async () => {
    const fake = createFakeDb();
    fake.queue('getFirstAsync', stored({ id: 8, job_url: 'https://example.com/job/8' }));
    const found = await findApplicationByUrl(fake.db, 'https://example.com/job/8');
    expect(found).not.toBeNull();
    expect(found?.id).toBe(8);
    expect(fake.calls[0]?.sql).toBe('SELECT * FROM applications WHERE job_url = ?');
    expect(fake.calls[0]?.params).toEqual(['https://example.com/job/8']);

    const missing = await findApplicationByUrl(fake.db, 'https://example.com/job/unknown');
    expect(missing).toBeNull();
  });

  it('logs only the error code for other failures', async () => {
    const fake = createFakeDb();
    fake.queue('getFirstAsync', null);
    fake.fail('runAsync', new Error(`failed insert ${draft().jobUrl}`));
    const error = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    const result = await insertApplication(fake.db, draft());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('DB_ERROR');
    const logged = error.mock.calls.map((call) => JSON.stringify(call)).join('\n');
    expect(logged).toContain('DB_ERROR');
    expect(logged).not.toContain(draft().jobUrl);
    error.mockRestore();
  });

  it('clamps the score, keeps null, and sets follow-up only for APPLIED', async () => {
    const applied = createFakeDb();
    applied.queue('getFirstAsync', null);
    applied.queue('runAsync', { changes: 1, lastInsertRowId: 5 });
    applied.queue('getFirstAsync', stored());
    const high = await insertApplication(applied.db, draft({ matchScore: 140.4 }));
    expect(high.ok).toBe(true);
    const insert = applied.calls.find((call) => call.method === 'runAsync');
    expect(insert?.params[6]).toBe(100);
    expect(insert?.sql).toContain("datetime('now', '+7 days')");
    expect(insert?.params[11]).toBe('APPLIED');

    const saved = createFakeDb();
    saved.queue('getFirstAsync', null);
    saved.queue('runAsync', { changes: 1, lastInsertRowId: 6 });
    saved.queue('getFirstAsync', stored({ id: 6, status: 'SAVED', follow_up_at: null, match_score: null }));
    await insertApplication(saved.db, draft({ status: 'SAVED', matchScore: null }));
    const savedInsert = saved.calls.find((call) => call.method === 'runAsync');
    expect(savedInsert?.params[6]).toBeNull();
    expect(savedInsert?.params[11]).toBe('SAVED');
  });

  it('skips unknown status or eligibility and drops unknown red-flag codes', async () => {
    const fake = createFakeDb();
    fake.queue('getAllAsync', [
      stored({ id: 1, status: 'HIRED' }),
      stored({ id: 2, eligibility: 'MAYBE' }),
      stored({
        id: 3,
        eligibility: null,
        red_flags_json: '[{"code":"NO_SALARY_INFO","detail":"None."},{"code":"SECRET","detail":"x"},{"code":"OTHER","detail":"Odd."}]',
      }),
    ]);
    const rows = await listApplications(fake.db);
    expect(fake.calls[0]?.sql).toContain('ORDER BY created_at DESC, id DESC');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.eligibility).toBeNull();
    expect(rows[0]?.redFlags).toEqual([
      { code: 'NO_SALARY_INFO', detail: 'None.' },
      { code: 'OTHER', detail: 'Odd.' },
    ]);
  });

  it('lists due follow-ups with a UTC timestamp bound', async () => {
    const fake = createFakeDb();
    fake.queue('getAllAsync', [stored()]);
    const due = await listFollowUpsDue(fake.db, new Date('2026-10-22T15:04:05.000Z'));
    expect(fake.calls[0]?.sql).toContain("status IN ('APPLIED', 'INTERVIEWING')");
    expect(fake.calls[0]?.sql).toContain('ORDER BY follow_up_at ASC');
    expect(fake.calls[0]?.params).toEqual(['2026-10-22 15:04:05']);
    expect(due).toHaveLength(1);
  });

  it('attaches tailor text to an application, storing empty strings as NULL', async () => {
    const fake = createFakeDb();
    await attachTailorText(fake.db, 'https://example.com/jobs/1', {
      coverNote: '  My cover note.  ',
      coldDm: '   ',
    });
    expect(fake.calls[0]?.sql).toBe('UPDATE applications SET cover_note = ?, cold_dm = ? WHERE job_url = ?');
    expect(fake.calls[0]?.params).toEqual(['  My cover note.  ', null, 'https://example.com/jobs/1']);
  });

  it('patches status, notes, follow-up, and truncates notes to 5000', async () => {
    const fake = createFakeDb();
    fake.queue('getFirstAsync', stored()); // existing
    fake.queue('runAsync', { changes: 1 });
    fake.queue('getFirstAsync', stored({ status: 'INTERVIEWING', notes: 'new note' })); // after patch

    const longNote = 'a'.repeat(6000);
    const patched = await patchApplication(fake.db, 5, {
      status: 'INTERVIEWING',
      notes: longNote,
    });
    expect(patched?.status).toBe('INTERVIEWING');
    const update = fake.calls.find((call) => call.method === 'runAsync');
    expect(update?.sql).toContain('status = ?');
    expect(update?.sql).toContain('status_changed_at = CURRENT_TIMESTAMP');
    expect(update?.sql).toContain('notes = ?');
    expect(update?.params[0]).toBe('INTERVIEWING');
    expect(update?.params[1]).toHaveLength(5000);
  });

  it('clears follow-up when status changes to OFFER, REJECTED, or WITHDRAWN unless specified', async () => {
    const fake = createFakeDb();
    fake.queue('getFirstAsync', stored({ status: 'APPLIED', follow_up_at: '2026-10-30 00:00:00' }));
    fake.queue('runAsync', { changes: 1 });
    fake.queue('getFirstAsync', stored({ status: 'OFFER', follow_up_at: null }));

    await patchApplication(fake.db, 5, { status: 'OFFER' });
    const update = fake.calls.find((call) => call.method === 'runAsync');
    expect(update?.sql).toContain('follow_up_at = ?');
    expect(update?.params).toContain(null);

    // If followUpAt is explicitly passed, it keeps it
    const fake2 = createFakeDb();
    fake2.queue('getFirstAsync', stored({ status: 'APPLIED' }));
    fake2.queue('runAsync', { changes: 1 });
    fake2.queue('getFirstAsync', stored({ status: 'REJECTED', follow_up_at: '2026-11-01 00:00:00' }));
    await patchApplication(fake2.db, 5, { status: 'REJECTED', followUpAt: '2026-11-01 00:00:00' });
    const update2 = fake2.calls.find((call) => call.method === 'runAsync');
    expect(update2?.params).toContain('2026-11-01 00:00:00');
  });

  it('returns null when patching non-existent application', async () => {
    const fake = createFakeDb();
    fake.queue('getFirstAsync', null);
    const result = await patchApplication(fake.db, 999, { status: 'INTERVIEWING' });
    expect(result).toBeNull();
  });

  it('deletes an application by id', async () => {
    const fake = createFakeDb();
    fake.queue('runAsync', { changes: 1 });
    await deleteApplication(fake.db, 5);
    expect(fake.calls[0]?.sql).toBe('DELETE FROM applications WHERE id = ?');
    expect(fake.calls[0]?.params).toEqual([5]);
  });
});
