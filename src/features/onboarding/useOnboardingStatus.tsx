import { createContext, useContext, type ReactNode } from 'react';

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
  // TODO(T-017): implement (kvGet on mount; markCompleted = kvSet + setState).
  return (
    <OnboardingContext.Provider value={{ completed: false, markCompleted: async () => {} }}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboardingStatus(): OnboardingStatus {
  return useContext(OnboardingContext);
}
