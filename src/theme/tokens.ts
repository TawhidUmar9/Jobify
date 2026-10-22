/**
 * Design tokens. CONTRACT FILE: UI_DIRECTIVES.md §1 documents every value.
 * Components must read colors via useTheme(); never hardcode hex in components.
 * Contrast ratios (WCAG) were measured and are listed in UI_DIRECTIVES.md §1.1.
 */

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  /** Decorative dividers only (<3:1 allowed). */
  border: string;
  /** Control boundaries: inputs, outlined buttons, chips (>=3:1). */
  borderStrong: string;
  primary: string;
  onPrimary: string;
  primaryPressed: string;
  /** Single call-to-action color: the Analyze FAB only. */
  accent: string;
  onAccent: string;
  accentPressed: string;
  successBg: string;
  successText: string;
  successIcon: string;
  warningBg: string;
  warningText: string;
  warningIcon: string;
  dangerBg: string;
  dangerText: string;
  dangerIcon: string;
  /** Bottom sheet / modal backdrop. */
  scrim: string;
  /** Snackbar surface and text (inverted). */
  inverseSurface: string;
  onInverseSurface: string;
  /** WebView load progress bar. */
  progress: string;
}

export const lightColors: ColorTokens = {
  background: '#F6F8F8',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2F2',
  textPrimary: '#0F1F1E',
  textSecondary: '#4A5A59',
  textDisabled: '#6B7A79',
  border: '#D5DEDD',
  borderStrong: '#7A8A88',
  primary: '#0F766E',
  onPrimary: '#FFFFFF',
  primaryPressed: '#0B5E58',
  accent: '#C2410C',
  onAccent: '#FFFFFF',
  accentPressed: '#9A3412',
  successBg: '#DCFCE7',
  successText: '#14532D',
  successIcon: '#15803D',
  warningBg: '#FEF9C3',
  warningText: '#713F12',
  warningIcon: '#A16207',
  dangerBg: '#FEE2E2',
  dangerText: '#7F1D1D',
  dangerIcon: '#B91C1C',
  scrim: 'rgba(15, 31, 30, 0.48)',
  inverseSurface: '#0F1F1E',
  onInverseSurface: '#FFFFFF',
  progress: '#0F766E',
};

export const darkColors: ColorTokens = {
  background: '#0B1312',
  surface: '#121D1C',
  surfaceMuted: '#1A2726',
  textPrimary: '#E6EEED',
  textSecondary: '#A3B3B1',
  textDisabled: '#7F8F8D',
  border: '#2A3A38',
  borderStrong: '#6B7F7D',
  primary: '#2DD4BF',
  onPrimary: '#04201D',
  primaryPressed: '#5EEAD4',
  accent: '#FB923C',
  onAccent: '#2A1205',
  accentPressed: '#FDBA74',
  successBg: '#0F2E1B',
  successText: '#86EFAC',
  successIcon: '#4ADE80',
  warningBg: '#2E2708',
  warningText: '#FDE047',
  warningIcon: '#FACC15',
  dangerBg: '#3A1212',
  dangerText: '#FCA5A5',
  dangerIcon: '#F87171',
  scrim: 'rgba(0, 0, 0, 0.64)',
  inverseSurface: '#E6EEED',
  onInverseSurface: '#0F1F1E',
  progress: '#2DD4BF',
};

/** 4-pt grid. Use only these values for padding, margin, and gap. */
export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

/** System font (San Francisco on iOS, Roboto on Android). No custom fonts. */
export const typography = {
  title: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 21, fontWeight: '600' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  score: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
} as const;

export type TypographyVariant = keyof typeof typography;

/** maxFontSizeMultiplier per context (UI_DIRECTIVES.md §8). */
export const fontScaleCaps = {
  /** Body text and buttons: allow up to 2x. */
  default: 2,
  /** Portal pills, chips, tab labels: single-line controls. */
  compact: 1.5,
} as const;

export const iconSizes = { sm: 16, md: 20, lg: 24 } as const;
export const iconStrokeWidth = 2;

/** Minimum hit target; enforce with minHeight/minWidth or hitSlop. */
export const touchTarget = { ios: 44, android: 48 } as const;

/** Android elevation / iOS shadow presets. Only these levels exist. */
export const elevation = {
  none: 0,
  card: 1,
  fab: 4,
  sheet: 8,
} as const;

/** Durations in ms. Under reduce-motion, every duration becomes 0 except progress bar. */
export const motion = {
  press: 100,
  fast: 150,
  base: 200,
  sheet: 250,
  snackbarVisibleMs: 4000,
} as const;
