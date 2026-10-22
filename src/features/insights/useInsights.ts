import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';

import { getInsights } from '../../db/repositories/insightsRepo';
import type { InsightsSummary } from '../../types/domain';

export interface InsightsState {
  status: 'loading' | 'ready' | 'error';
  summary: InsightsSummary | null;
  reload: () => void;
}

/** getInsights(db, new Date()) on mount and focus. CONTRACT: ARCHITECTURE.md §7.4. */
export function useInsights(): InsightsState {
  const db = useSQLiteContext();
  const [status, setStatus] = useState<InsightsState['status']>('loading');
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    try {
      const data = await getInsights(db, new Date());
      if (request !== requestRef.current) return;
      setSummary(data);
      setStatus('ready');
    } catch {
      if (request !== requestRef.current) return;
      setStatus('error');
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const reload = useCallback(() => {
    void load();
  }, [load]);

  return { status, summary, reload };
}
