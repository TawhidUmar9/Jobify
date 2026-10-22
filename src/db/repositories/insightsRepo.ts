import type { SQLiteDatabase } from 'expo-sqlite';

import type { InsightsSummary } from '../../types/domain';

/**
 * Computes InsightsSummary with SQL aggregates (no row-by-row JS over the whole table).
 * Definitions in src/types/domain.ts (InsightsSummary, RESPONSE_STATUSES).
 * - byResume groups by resume_label ('' → "No resume"); byBoard by board_name. Both exclude SAVED,
 *   sorted by applied DESC, max 10 rows each.
 * - appliedPerWeek: 8 entries, weeks starting Monday (UTC), oldest first, zero-filled.
 *   `now` is injected for tests.
 */
export async function getInsights(db: SQLiteDatabase, now: Date): Promise<InsightsSummary> {
  // TODO(T-011): implement.
  void db;
  void now;
  return {
    total: 0,
    byStatus: { SAVED: 0, APPLIED: 0, INTERVIEWING: 0, OFFER: 0, REJECTED: 0, WITHDRAWN: 0 },
    applied: 0,
    responses: 0,
    interviews: 0,
    byResume: [],
    byBoard: [],
    appliedPerWeek: [],
  };
}
