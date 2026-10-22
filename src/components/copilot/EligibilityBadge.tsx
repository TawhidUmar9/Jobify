import { CircleCheck, CircleHelp, CircleX, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { iconSizes, iconStrokeWidth, radii, spacing, typography } from '../../theme/tokens';
import type { Eligibility } from '../../types/domain';

export interface EligibilityBadgeProps {
  eligibility: Eligibility;
  reason: string;
}

/** Visual mapping. CONTRACT: UI_DIRECTIVES.md §4.4. */
export const ELIGIBILITY_PRESENTATION: Record<
  Eligibility,
  { label: string; tone: 'success' | 'warning' | 'danger'; icon: 'CircleCheck' | 'CircleHelp' | 'CircleX' }
> = {
  ELIGIBLE: { label: 'You can apply', tone: 'success', icon: 'CircleCheck' },
  UNCLEAR: { label: 'Eligibility unclear', tone: 'warning', icon: 'CircleHelp' },
  NOT_ELIGIBLE: { label: 'Likely not eligible', tone: 'danger', icon: 'CircleX' },
};

const ICONS: Record<EligibilityBadgeProps['eligibility'], LucideIcon> = {
  ELIGIBLE: CircleCheck,
  UNCLEAR: CircleHelp,
  NOT_ELIGIBLE: CircleX,
};

/**
 * Pill with tone bg, tone icon 16, label (TestIds.copilot.eligibilityBadge, accessibilityLabel
 * `Eligibility: ${label}`), reason below (body, textSecondary, TestIds.copilot.eligibilityReason).
 */
export function EligibilityBadge({ eligibility, reason }: EligibilityBadgeProps) {
  const { colors } = useTheme();
  const presentation = ELIGIBILITY_PRESENTATION[eligibility];
  const Icon = ICONS[eligibility];
  const tone = {
    success: { bg: colors.successBg, text: colors.successText, icon: colors.successIcon },
    warning: { bg: colors.warningBg, text: colors.warningText, icon: colors.warningIcon },
    danger: { bg: colors.dangerBg, text: colors.dangerText, icon: colors.dangerIcon },
  }[presentation.tone];
  return (
    <View>
      <View
        testID={TestIds.copilot.eligibilityBadge}
        accessibilityLabel={`Eligibility: ${presentation.label}`}
        style={[styles.pill, { backgroundColor: tone.bg }]}
      >
        <Icon size={iconSizes.sm} strokeWidth={iconStrokeWidth} color={tone.icon} accessible={false} />
        <Text style={[styles.pillLabel, { color: tone.text }]}>{presentation.label}</Text>
      </View>
      <Text testID={TestIds.copilot.eligibilityReason} style={[styles.reason, { color: colors.textSecondary }]}>
        {reason}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  pillLabel: {
    ...typography.label,
  },
  reason: {
    ...typography.body,
    marginTop: spacing.xs,
  },
});
