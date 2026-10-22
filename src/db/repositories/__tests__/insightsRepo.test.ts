import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { getInsights } from '../insightsRepo';

/**
 * getInsights query order:
 * 1. total (getFirst)
 * 2. byStatus (getAll)
 * 3. applied (getFirst)
 * 4. responses (getFirst)
 * 5. interviews (getFirst)
 * 6. byResume (getAll)
 * 7. byBoard (getAll)
 * 8–15. one getFirst count per Monday-start week, oldest first
 */
describe('insightsRepo', () => {
  it('zero-fills statuses and eight Monday weeks when the table is empty', async () => {
    const fake = createFakeDb();
    const summary = await getInsights(fake.db, new Date('2026-10-22T12:00:00.000Z'));
    expect(summary.total).toBe(0);
    expect(summary.byStatus).toEqual({
      SAVED: 0,
      APPLIED: 0,
      INTERVIEWING: 0,
      OFFER: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
    });
    expect(summary.appliedPerWeek.map((week) => week.weekStart)).toEqual([
      '2026-08-31',
      '2026-09-07',
      '2026-09-14',
      '2026-09-21',
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
      '2026-10-19',
    ]);
    expect(summary.appliedPerWeek.every((week) => week.count === 0)).toBe(true);
    const resumeSql = fake.calls.find((call) => call.sql.includes('resume_label'))?.sql ?? '';
    expect(resumeSql).toContain("THEN 'No resume'");
    expect(resumeSql).toContain("status != 'SAVED'");
    expect(resumeSql).toContain('ORDER BY applied DESC');
    expect(resumeSql).toContain('LIMIT 10');
    const weekCalls = fake.calls.filter((call) => call.sql.includes('created_at >= ?'));
    expect(weekCalls[0]?.params).toEqual(['2026-08-31 00:00:00', '2026-09-07 00:00:00']);
    expect(weekCalls[7]?.params).toEqual(['2026-10-19 00:00:00', '2026-10-26 00:00:00']);
  });

  it('reads aggregates and ignores unknown statuses', async () => {
    const fake = createFakeDb();
    fake.queue('getFirstAsync', { n: 6 });
    fake.queue('getAllAsync', [
      { status: 'APPLIED', n: 3 },
      { status: 'INTERVIEWING', n: 1 },
      { status: 'HIRED', n: 9 },
    ]);
    fake.queue('getFirstAsync', { n: 5 });
    fake.queue('getFirstAsync', { n: 2 });
    fake.queue('getFirstAsync', { n: 1 });
    fake.queue('getAllAsync', [{ key: 'No resume', applied: 2, responses: 1, interviews: 0 }]);
    fake.queue('getAllAsync', [{ key: 'Wellfound', applied: 4, responses: 1, interviews: 1 }]);
    fake.queue('getFirstAsync', { n: 3 });
    const summary = await getInsights(fake.db, new Date('2026-10-22T00:00:00.000Z'));
    expect(summary.total).toBe(6);
    expect(summary.byStatus.APPLIED).toBe(3);
    expect(summary.byStatus.INTERVIEWING).toBe(1);
    expect(summary.byStatus.SAVED).toBe(0);
    expect(summary.applied).toBe(5);
    expect(summary.responses).toBe(2);
    expect(summary.interviews).toBe(1);
    expect(summary.byResume).toEqual([{ key: 'No resume', applied: 2, responses: 1, interviews: 0 }]);
    expect(summary.byBoard).toEqual([{ key: 'Wellfound', applied: 4, responses: 1, interviews: 1 }]);
    expect(summary.appliedPerWeek[0]?.count).toBe(3);
    expect(summary.appliedPerWeek[1]?.count).toBe(0);
    const responseSql = fake.calls[3]?.sql ?? '';
    expect(responseSql).toContain("'INTERVIEWING'");
    expect(responseSql).toContain("'OFFER'");
    expect(responseSql).toContain("'REJECTED'");
  });
});
