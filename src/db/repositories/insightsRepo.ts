import type { SQLiteDatabase } from 'expo-sqlite';

import {
  APPLICATION_STATUSES,
  RESPONSE_STATUSES,
  type ApplicationStatus,
  type InsightsSummary,
  type RateRow,
} from '../../types/domain';

const RESPONSE_SQL = RESPONSE_STATUSES.map((status) => `'${status}'`).join(', ');
const INTERVIEW_SQL = `'INTERVIEWING', 'OFFER'`;

function asCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function isStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

function emptyByStatus(): Record<ApplicationStatus, number> {
  return { SAVED: 0, APPLIED: 0, INTERVIEWING: 0, OFFER: 0, REJECTED: 0, WITHDRAWN: 0 };
}

function utcMonday(now: Date): Date {
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = monday.getUTCDay();
  const delta = day === 0 ? 6 : day - 1;
  monday.setUTCDate(monday.getUTCDate() - delta);
  return monday;
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function weekBounds(now: Date): { weekStart: string; start: string; end: string }[] {
  const thisMonday = utcMonday(now);
  const weeks: { weekStart: string; start: string; end: string }[] = [];
  for (let offset = 7; offset >= 0; offset -= 1) {
    const start = new Date(thisMonday);
    start.setUTCDate(start.getUTCDate() - offset * 7);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    const weekStart = formatDay(start);
    weeks.push({ weekStart, start: `${weekStart} 00:00:00`, end: `${formatDay(end)} 00:00:00` });
  }
  return weeks;
}

async function readCount(db: SQLiteDatabase, sql: string, params: string[] = []): Promise<number> {
  const row = await db.getFirstAsync<{ n: unknown }>(sql, params);
  return asCount(row?.n);
}

async function readRates(db: SQLiteDatabase, sql: string): Promise<RateRow[]> {
  const rows = await db.getAllAsync<{ key: unknown; applied: unknown; responses: unknown; interviews: unknown }>(sql);
  const rates: RateRow[] = [];
  for (const row of rows) {
    if (typeof row.key !== 'string') continue;
    rates.push({
      key: row.key,
      applied: asCount(row.applied),
      responses: asCount(row.responses),
      interviews: asCount(row.interviews),
    });
  }
  return rates;
}

const RATE_SELECT = `COUNT(*) AS applied,
       SUM(CASE WHEN status IN (${RESPONSE_SQL}) THEN 1 ELSE 0 END) AS responses,
       SUM(CASE WHEN status IN (${INTERVIEW_SQL}) THEN 1 ELSE 0 END) AS interviews`;

/**
 * Computes InsightsSummary with SQL aggregates (no row-by-row JS over the whole table).
 * Definitions in src/types/domain.ts (InsightsSummary, RESPONSE_STATUSES).
 * - byResume groups by resume_label ('' → "No resume"); byBoard by board_name. Both exclude SAVED,
 *   sorted by applied DESC, max 10 rows each.
 * - appliedPerWeek: 8 entries, weeks starting Monday (UTC), oldest first, zero-filled.
 *   `now` is injected for tests.
 */
export async function getInsights(db: SQLiteDatabase, now: Date): Promise<InsightsSummary> {
  const total = await readCount(db, 'SELECT COUNT(*) AS n FROM applications');
  const statusRows = await db.getAllAsync<{ status: unknown; n: unknown }>(
    'SELECT status, COUNT(*) AS n FROM applications GROUP BY status',
  );
  const byStatus = emptyByStatus();
  for (const row of statusRows) {
    if (typeof row.status === 'string' && isStatus(row.status)) byStatus[row.status] = asCount(row.n);
  }
  const applied = await readCount(db, `SELECT COUNT(*) AS n FROM applications WHERE status != 'SAVED'`);
  const responses = await readCount(
    db,
    `SELECT COUNT(*) AS n FROM applications WHERE status IN (${RESPONSE_SQL})`,
  );
  const interviews = await readCount(
    db,
    `SELECT COUNT(*) AS n FROM applications WHERE status IN (${INTERVIEW_SQL})`,
  );
  const byResume = await readRates(
    db,
    `SELECT CASE WHEN resume_label = '' THEN 'No resume' ELSE resume_label END AS key,
            ${RATE_SELECT}
     FROM applications
     WHERE status != 'SAVED'
     GROUP BY 1
     ORDER BY applied DESC
     LIMIT 10`,
  );
  const byBoard = await readRates(
    db,
    `SELECT board_name AS key,
            ${RATE_SELECT}
     FROM applications
     WHERE status != 'SAVED'
     GROUP BY board_name
     ORDER BY applied DESC
     LIMIT 10`,
  );
  const appliedPerWeek: InsightsSummary['appliedPerWeek'] = [];
  for (const week of weekBounds(now)) {
    const count = await readCount(
      db,
      `SELECT COUNT(*) AS n FROM applications
       WHERE status != 'SAVED' AND created_at >= ? AND created_at < ?`,
      [week.start, week.end],
    );
    appliedPerWeek.push({ weekStart: week.weekStart, count });
  }
  return { total, byStatus, applied, responses, interviews, byResume, byBoard, appliedPerWeek };
}
