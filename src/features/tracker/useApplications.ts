import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';

import { listApplications, listFollowUpsDue } from '../../db/repositories/applicationsRepo';
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
  const db = useSQLiteContext();
  const [status, setStatus] = useState<ApplicationsState['status']>('loading');
  const [applications, setApplications] = useState<Application[]>([]);
  const [followUpsDue, setFollowUpsDue] = useState<Application[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const requestRef = useRef(0);

  const load = useCallback(
    async (mode: 'focus' | 'refresh') => {
      const request = ++requestRef.current;
      if (mode === 'refresh') setRefreshing(true);
      try {
        const now = new Date();
        const list = await listApplications(db);
        const due = await listFollowUpsDue(db, now);
        if (request !== requestRef.current) return;
        setApplications(list);
        setFollowUpsDue(due);
        setStatus('ready');
      } catch {
        if (request !== requestRef.current) return;
        setStatus('error');
      } finally {
        if (request === requestRef.current) setRefreshing(false);
      }
    },
    [db],
  );

  useFocusEffect(
    useCallback(() => {
      void load('focus');
    }, [load]),
  );

  const refresh = useCallback(() => {
    void load('refresh');
  }, [load]);

  return { status, applications, followUpsDue, refreshing, refresh };
}
