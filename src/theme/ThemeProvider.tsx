import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import {
  useUiPrefs,
  type ReduceMotionMode,
  type ThemeMode,
} from '../features/settings/useUiPrefs';
import {
  darkColors,
  getScaledTypography,
  lightColors,
  typography as defaultTypography,
  type ColorTokens,
  type TextScale,
} from './tokens';

export interface Theme {
  scheme: 'light' | 'dark';
  colors: ColorTokens;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  textScale: TextScale;
  setTextScale: (scale: TextScale) => Promise<void>;
  webZoom: number;
  setWebZoom: (zoom: number) => Promise<void>;
  reduceMotion: ReduceMotionMode;
  setReduceMotion: (mode: ReduceMotionMode) => Promise<void>;
  isReduceMotion: boolean;
  typography: ReturnType<typeof getScaledTypography>;
}

const defaultTheme: Theme = {
  scheme: 'light',
  colors: lightColors,
  themeMode: 'system',
  setThemeMode: async () => {},
  textScale: 'system',
  setTextScale: async () => {},
  webZoom: 100,
  setWebZoom: async () => {},
  reduceMotion: 'system',
  setReduceMotion: async () => {},
  isReduceMotion: false,
  typography: defaultTypography,
};

const ThemeContext = createContext<Theme>(defaultTheme);

/**
 * Provides theme and UI preferences (theme mode, text scale, web zoom, reduce motion).
 * Follows system scheme when themeMode is 'system', or forces 'light' / 'dark'.
 * Applies preference changes live with no restart.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const osColorScheme = useColorScheme();
  const uiPrefs = useUiPrefs();

  const scheme: 'light' | 'dark' = useMemo(() => {
    if (uiPrefs.themeMode === 'system') {
      return osColorScheme === 'dark' ? 'dark' : 'light';
    }
    return uiPrefs.themeMode;
  }, [uiPrefs.themeMode, osColorScheme]);

  const colors = useMemo(() => (scheme === 'dark' ? darkColors : lightColors), [scheme]);

  const typography = useMemo(
    () => getScaledTypography(uiPrefs.textScale),
    [uiPrefs.textScale],
  );

  const value = useMemo<Theme>(
    () => ({
      scheme,
      colors,
      themeMode: uiPrefs.themeMode,
      setThemeMode: uiPrefs.setThemeMode,
      textScale: uiPrefs.textScale,
      setTextScale: uiPrefs.setTextScale,
      webZoom: uiPrefs.webZoom,
      setWebZoom: uiPrefs.setWebZoom,
      reduceMotion: uiPrefs.reduceMotion,
      setReduceMotion: uiPrefs.setReduceMotion,
      isReduceMotion: uiPrefs.isReduceMotion,
      typography,
    }),
    [scheme, colors, uiPrefs, typography],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
