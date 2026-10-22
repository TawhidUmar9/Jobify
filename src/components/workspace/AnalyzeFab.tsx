import { Pressable, Text } from 'react-native';

import { TestIds } from '../../constants/testIds';

export interface AnalyzeFabProps {
  onPress: () => void;
  /** True while the page is loading or the copilot is scraping/analyzing/filling. */
  disabled: boolean;
  /** True while scraping/analyzing: shows a spinner and label "Analyzing…". */
  busy: boolean;
  /** No AI provider configured: label "Set up AI" (icon Settings2), press opens Settings → AI provider. */
  aiMissing: boolean;
}

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
  // TODO(T-028): implement per the rules above.
  return (
    <Pressable
      testID={TestIds.workspace.analyzeFab}
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel="Analyze this job page and prepare auto-fill"
      accessibilityState={{ disabled, busy }}
      style={{ position: 'absolute', right: 16, bottom: 16, minHeight: 56, justifyContent: 'center' }}
    >
      <Text>{aiMissing ? 'Set up AI' : busy ? 'Analyzing…' : 'Analyze & Fill'}</Text>
    </Pressable>
  );
}
