import { darkColors, getScaledTypography, lightColors, resolveTextScaleMultiplier, typography } from '../tokens';

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe('tokens & contrast', () => {
  it('defines the exact same token names in light and dark themes', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('preserves required GitHub Primer colors in light mode', () => {
    expect(lightColors.background).toBe('#ffffff');
    expect(lightColors.surface).toBe('#f6f8fa');
    expect(lightColors.textPrimary).toBe('#1f2328');
    expect(lightColors.textSecondary).toBe('#59636e');
    expect(lightColors.primary).toBe('#0969da');
    expect(lightColors.onPrimary).toBe('#ffffff');
  });

  it('preserves required GitHub Primer colors in dark mode', () => {
    expect(darkColors.background).toBe('#0d1117');
    expect(darkColors.surface).toBe('#151b23');
    expect(darkColors.textPrimary).toBe('#f0f6fc');
    expect(darkColors.textSecondary).toBe('#9198a1');
    expect(darkColors.primary).toBe('#4493f8');
    expect(darkColors.onPrimary).toBe('#ffffff');
  });

  it('satisfies WCAG AA contrast for textSecondary on surface in both themes', () => {
    const lightRatio = getContrastRatio(lightColors.textSecondary, lightColors.surface);
    const darkRatio = getContrastRatio(darkColors.textSecondary, darkColors.surface);

    expect(lightRatio).toBeGreaterThanOrEqual(4.5);
    expect(darkRatio).toBeGreaterThanOrEqual(4.5);
  });

  it('satisfies contrast requirements for onPrimary on primary in both themes', () => {
    const lightRatio = getContrastRatio(lightColors.onPrimary, lightColors.primary);
    const darkRatio = getContrastRatio(darkColors.onPrimary, darkColors.primary);

    // Light button text exceeds normal text AA requirement (4.5:1)
    expect(lightRatio).toBeGreaterThanOrEqual(4.5);
    // Dark button text on primary satisfies large/button text AA requirement (3.0:1)
    expect(darkRatio).toBeGreaterThanOrEqual(3.0);
  });

  it('satisfies WCAG AA contrast for textPrimary on background and surface in both themes', () => {
    expect(getContrastRatio(lightColors.textPrimary, lightColors.background)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(lightColors.textPrimary, lightColors.surface)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(darkColors.textPrimary, darkColors.background)).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(darkColors.textPrimary, darkColors.surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('scales typography according to textScale multiplier', () => {
    expect(resolveTextScaleMultiplier('system')).toBe(1);
    expect(resolveTextScaleMultiplier('1')).toBe(1);
    expect(resolveTextScaleMultiplier('0.9')).toBe(0.9);
    expect(resolveTextScaleMultiplier('1.15')).toBe(1.15);
    expect(resolveTextScaleMultiplier('1.3')).toBe(1.3);

    const base = getScaledTypography('system');
    expect(base.body.fontSize).toBe(typography.body.fontSize);

    const scaled115 = getScaledTypography('1.15');
    expect(scaled115.body.fontSize).toBe(Math.round(typography.body.fontSize * 1.15));
    expect(scaled115.title.fontSize).toBe(Math.round(typography.title.fontSize * 1.15));

    const scaled09 = getScaledTypography('0.9');
    expect(scaled09.body.fontSize).toBe(Math.round(typography.body.fontSize * 0.9));
  });
});
