import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, motion, radii, spacing, touchTarget, typography } from '../../theme/tokens';

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
  const { colors, isReduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const reduceMotion = isReduceMotion;
  const [opacity, setOpacity] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeInTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeOutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (hideTimer.current !== null) clearTimeout(hideTimer.current);
    if (fadeInTimer.current !== null) clearTimeout(fadeInTimer.current);
    if (fadeOutTimer.current !== null) clearTimeout(fadeOutTimer.current);
    hideTimer.current = null;
    fadeInTimer.current = null;
    fadeOutTimer.current = null;
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const show = useCallback(
    (next: string) => {
      clearTimers();
      setMessage(next);
      setOpacity(reduceMotion ? 1 : 0);
      if (!reduceMotion) {
        fadeInTimer.current = setTimeout(() => {
          fadeInTimer.current = null;
          setOpacity(1);
        }, motion.fast);
        fadeOutTimer.current = setTimeout(() => {
          fadeOutTimer.current = null;
          setOpacity(0);
        }, motion.snackbarVisibleMs - motion.fast);
      }
      hideTimer.current = setTimeout(() => {
        hideTimer.current = null;
        setMessage(null);
        setOpacity(0);
      }, motion.snackbarVisibleMs);
    },
    [clearTimers, reduceMotion],
  );

  useEffect(() => {
    if (message && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  const api = useMemo<SnackbarApi>(() => ({ show }), [show]);

  return (
    <SnackbarContext.Provider value={api}>
      <View style={styles.host} pointerEvents="box-none">
        {children}
        {message !== null ? (
          <View
            testID={TestIds.snackbar}
            pointerEvents="box-none"
            accessibilityLiveRegion={Platform.OS === 'android' ? 'polite' : 'none'}
            style={[
              styles.snackbar,
              {
                bottom: insets.bottom + spacing.md,
                backgroundColor: colors.inverseSurface,
                opacity,
              },
            ]}
          >
            <Text
              testID={TestIds.snackbarText}
              numberOfLines={2}
              maxFontSizeMultiplier={fontScaleCaps.default}
              style={[styles.text, { color: colors.onInverseSurface }]}
            >
              {message}
            </Text>
          </View>
        ) : null}
      </View>
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarApi {
  return useContext(SnackbarContext);
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
  snackbar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    minHeight: touchTarget.android,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  text: {
    ...typography.body,
  },
});
