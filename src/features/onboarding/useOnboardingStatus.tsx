import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { KV_KEYS, kvGet, kvSet } from '../../services/kvStore';

export interface OnboardingStatus {
  /** null while reading kv-store. */
  completed: boolean | null;
  /** Sets KV onboardingCompleted = "1" and flips `completed` (the root Stack.Protected guard follows). */
  markCompleted: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingStatus>({ completed: null, markCompleted: async () => {} });

/**
 * Reads KV_KEYS.onboardingCompleted once on mount and provides it app-wide (onboarding screens and
 * backup import flip it). CONTRACT: ARCHITECTURE.md §8 (root gate).
 */
export function OnboardingStatusProvider({ children }: { children: ReactNode }) {
  const [completed, setCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void kvGet(KV_KEYS.onboardingCompleted).then((value) => {
      if (!cancelled) setCompleted(value === '1');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const markCompleted = useCallback(async () => {
    await kvSet(KV_KEYS.onboardingCompleted, '1');
    setCompleted(true);
  }, []);

  const value = useMemo(() => ({ completed, markCompleted }), [completed, markCompleted]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboardingStatus(): OnboardingStatus {
  return useContext(OnboardingContext);
}
