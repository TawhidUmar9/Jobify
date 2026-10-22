import type { InsightsSummary } from '../../types/domain';

export interface InsightsState {
  status: 'loading' | 'ready' | 'error';
  summary: InsightsSummary | null;
  reload: () => void;
}

/** getInsights(db, new Date()) on mount and focus. CONTRACT: ARCHITECTURE.md §7.4. */
export function useInsights(): InsightsState {
  // TODO(T-038): implement.
  return { status: 'loading', summary: null, reload: () => {} };
}
