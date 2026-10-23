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
  background: '#ffffff',
  surface: '#f6f8fa',
  surfaceMuted: '#f6f8fa',
  textPrimary: '#1f2328',
  textSecondary: '#59636e',
  textDisabled: '#8c959f',
  border: '#d1d9e0',
  borderStrong: '#818b98',
  primary: '#0969da',
  onPrimary: '#ffffff',
  primaryPressed: '#0860ca',
  accent: '#0969da',
  onAccent: '#ffffff',
  accentPressed: '#0860ca',
  successBg: '#dafbe1',
  successText: '#1a7f37',
  successIcon: '#1a7f37',
  warningBg: '#fff8c5',
  warningText: '#9a6700',
  warningIcon: '#9a6700',
  dangerBg: '#ffebe9',
  dangerText: '#d1242f',
  dangerIcon: '#d1242f',
  scrim: 'rgba(31, 35, 40, 0.5)',
  inverseSurface: '#1f2328',
  onInverseSurface: '#ffffff',
  progress: '#0969da',
};

export const darkColors: ColorTokens = {
  background: '#0d1117',
  surface: '#151b23',
  surfaceMuted: '#212830',
  textPrimary: '#f0f6fc',
  textSecondary: '#9198a1',
  textDisabled: '#656c76',
  border: '#3d444d',
  borderStrong: '#656c76',
  primary: '#4493f8',
  onPrimary: '#ffffff',
  primaryPressed: '#388bfd',
  accent: '#4493f8',
  onAccent: '#ffffff',
  accentPressed: '#388bfd',
  successBg: '#04260f',
  successText: '#3fb950',
  successIcon: '#3fb950',
  warningBg: '#2b1d00',
  warningText: '#d29922',
  warningIcon: '#d29922',
  dangerBg: '#3c0d0d',
  dangerText: '#f85149',
  dangerIcon: '#f85149',
  scrim: 'rgba(1, 4, 9, 0.8)',
  inverseSurface: '#f0f6fc',
  onInverseSurface: '#0d1117',
  progress: '#4493f8',
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

export type TextScale = 'system' | '0.9' | '1' | '1.15' | '1.3';

export function resolveTextScaleMultiplier(scale: TextScale = 'system'): number {
  if (scale === 'system') return 1;
  const num = parseFloat(scale);
  return Number.isFinite(num) && num > 0 ? num : 1;
}

export function getScaledTypography(scale: TextScale = 'system') {
  const factor = resolveTextScaleMultiplier(scale);
  if (factor === 1) return typography;
  return {
    title: {
      ...typography.title,
      fontSize: Math.round(typography.title.fontSize * factor),
      lineHeight: Math.round(typography.title.lineHeight * factor),
    },
    headline: {
      ...typography.headline,
      fontSize: Math.round(typography.headline.fontSize * factor),
      lineHeight: Math.round(typography.headline.lineHeight * factor),
    },
    body: {
      ...typography.body,
      fontSize: Math.round(typography.body.fontSize * factor),
      lineHeight: Math.round(typography.body.lineHeight * factor),
    },
    bodyStrong: {
      ...typography.bodyStrong,
      fontSize: Math.round(typography.bodyStrong.fontSize * factor),
      lineHeight: Math.round(typography.bodyStrong.lineHeight * factor),
    },
    label: {
      ...typography.label,
      fontSize: Math.round(typography.label.fontSize * factor),
      lineHeight: Math.round(typography.label.lineHeight * factor),
    },
    caption: {
      ...typography.caption,
      fontSize: Math.round(typography.caption.fontSize * factor),
      lineHeight: Math.round(typography.caption.lineHeight * factor),
    },
    score: {
      ...typography.score,
      fontSize: Math.round(typography.score.fontSize * factor),
      lineHeight: Math.round(typography.score.lineHeight * factor),
    },
  };
}

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
