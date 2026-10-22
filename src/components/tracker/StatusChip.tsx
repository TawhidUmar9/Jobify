import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, radii, spacing, typography } from '../../theme/tokens';
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from '../../types/domain';

export interface StatusChipProps {
  status: ApplicationStatus;
  testID?: string;
}

/** Tone per status. CONTRACT: UI_DIRECTIVES.md §4.5 "Status chip". */
export const STATUS_TONE: Record<ApplicationStatus, 'neutral' | 'primary' | 'warning' | 'success' | 'danger'> = {
  SAVED: 'neutral',
  APPLIED: 'primary',
  INTERVIEWING: 'warning',
  OFFER: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'neutral',
};

/** Doc comment specifies this height; it is not a spacing token. */
const CHIP_HEIGHT = 24;

/**
 * Non-interactive label. Height 24, padding horizontal spacing.xs, radius pill,
 * typography.caption weight 600, maxFontSizeMultiplier compact.
 * neutral: bg surfaceMuted / textSecondary; primary: 1px primary border / text primary;
 * warning|success|danger: <tone>Bg / <tone>Text.
 */
export function StatusChip({ status, testID }: StatusChipProps) {
  const { colors } = useTheme();
  const tone = STATUS_TONE[status];
  const palette = {
    neutral: { backgroundColor: colors.surfaceMuted, color: colors.textSecondary, borderColor: undefined },
    primary: { backgroundColor: 'transparent', color: colors.primary, borderColor: colors.primary },
    warning: { backgroundColor: colors.warningBg, color: colors.warningText, borderColor: undefined },
    success: { backgroundColor: colors.successBg, color: colors.successText, borderColor: undefined },
    danger: { backgroundColor: colors.dangerBg, color: colors.dangerText, borderColor: undefined },
  }[tone];

  return (
    <View
      testID={testID}
      style={[
        styles.chip,
        { backgroundColor: palette.backgroundColor },
        palette.borderColor ? { borderWidth: 1, borderColor: palette.borderColor } : null,
      ]}
    >
      <Text
        maxFontSizeMultiplier={fontScaleCaps.compact}
        style={[styles.label, { color: palette.color }]}
      >
        {APPLICATION_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
  },
});
