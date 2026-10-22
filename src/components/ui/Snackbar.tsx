import { createContext, useContext, useMemo, type ReactNode } from 'react';

export interface SnackbarApi {
  /** Shows `message` for motion.snackbarVisibleMs (4000 ms). A new call replaces the current one. */
  show: (message: string) => void;
}

const SnackbarContext = createContext<SnackbarApi>({ show: () => {} });

/**
 * Provides useSnackbar() and renders a single snackbar. UI_DIRECTIVES.md §3 "Snackbar".
 * - Position: bottom, above the tab bar and above the safe-area inset, margin spacing.md.
 * - bg colors.inverseSurface, text colors.onInverseSurface, typography.body, radius radii.md,
 *   min height 48, max 2 lines.
 * - Fade in/out motion.fast; instant under reduce-motion.
 * - accessibilityLiveRegion "polite" on Android; AccessibilityInfo.announceForAccessibility on iOS.
 * - testID TestIds.snackbar on the container, TestIds.snackbarText on the text.
 * - Not dismissible by swipe (auto-hide only); does not block touches outside its box.
 */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  // TODO(T-002): implement per the rules above.
  const api = useMemo<SnackbarApi>(() => ({ show: () => {} }), []);
  return <SnackbarContext.Provider value={api}>{children}</SnackbarContext.Provider>;
}

export function useSnackbar(): SnackbarApi {
  return useContext(SnackbarContext);
}
