import { Settings2, Sparkles } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { elevation, fontScaleCaps, iconSizes, iconStrokeWidth, radii, spacing, typography } from '../../theme/tokens';

export interface AnalyzeFabProps {
  onPress: () => void;
  /** True while the page is loading or the copilot is scraping/analyzing/filling. */
  disabled: boolean;
  /** True while scraping/analyzing: shows a spinner and label "Analyzing…". */
  busy: boolean;
  /** No AI provider configured: label "Set up AI" (icon Settings2), press opens Settings → AI provider. */
  aiMissing: boolean;
}

/** Height from UI_DIRECTIVES §4.1. The tab bar already includes the bottom inset, so the offset is spacing.md. */
const FAB_HEIGHT = 56;

/**
 * Extended floating action button "Analyze & Fill". UI_DIRECTIVES.md §4.1 "Analyze FAB".
 * - Position: absolute, right spacing.md, bottom = spacing.md + safe-area bottom inset
 *   (tab bar already accounts for the inset; use useBottomTabBarHeight offset 0 inside tabs).
 * - Height 56, radius radii.lg, padding horizontal spacing.lg, bg colors.accent, content
 *   colors.onAccent, elevation.fab. Icon: lucide Sparkles 20 (decorative) + label
 *   typography.bodyStrong "Analyze & Fill" (busy: ActivityIndicator + "Analyzing…").
 * - disabled: opacity 0.4, accessibilityState {disabled:true}.
 * - accessibilityRole "button", accessibilityLabel "Analyze this job page and prepare auto-fill".
 * - testID TestIds.workspace.analyzeFab.
 * - Hidden (not rendered) while the copilot sheet is open.
 */
export function AnalyzeFab({ onPress, disabled, busy, aiMissing }: AnalyzeFabProps) {
  const { colors } = useTheme();
  const label = aiMissing ? 'Set up AI' : busy ? 'Analyzing…' : 'Analyze & Fill';
  const Icon = aiMissing ? Settings2 : Sparkles;
  return (
    <Pressable
      testID={TestIds.workspace.analyzeFab}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Analyze this job page and prepare auto-fill"
      accessibilityState={{ disabled, busy }}
      style={[
        styles.fab,
        { backgroundColor: colors.accent, opacity: disabled ? 0.4 : 1 },
      ]}
    >
      {busy && !aiMissing ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <Icon size={iconSizes.md} strokeWidth={iconStrokeWidth} color={colors.onAccent} accessible={false} />
      )}
      <Text
        style={[styles.label, { color: colors.onAccent }]}
        maxFontSizeMultiplier={fontScaleCaps.default}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    height: FAB_HEIGHT,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    elevation: elevation.fab,
  },
  label: {
    ...typography.bodyStrong,
  },
});
