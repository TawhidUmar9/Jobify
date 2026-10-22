import type { Application } from '../../types/domain';

export interface ApplicationsState {
  status: 'loading' | 'ready' | 'error';
  applications: Application[];
  /** listFollowUpsDue(db, new Date()) at the same load. */
  followUpsDue: Application[];
  /** True during pull-to-refresh only. */
  refreshing: boolean;
  refresh: () => void;
}

/**
 * Tracker data. CONTRACT: ARCHITECTURE.md §7.4.
 * - Loads listApplications + listFollowUpsDue on mount and on every focus (useFocusEffect);
 *   focus reloads keep the current lists visible (no loading state).
 * - refresh(): refreshing=true → reload → false. DB error → status 'error'.
 */
export function useApplications(): ApplicationsState {
  // TODO(T-031): implement per the rules above.
  return { status: 'loading', applications: [], followUpsDue: [], refreshing: false, refresh: () => {} };
}
