import { ShieldCheck, TriangleAlert } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { iconSizes, iconStrokeWidth, spacing, typography } from '../../theme/tokens';
import type { RedFlag, RedFlagCode } from '../../types/domain';

/** Short titles per code. CONTRACT: UI_DIRECTIVES.md §4.4. */
export const RED_FLAG_TITLES: Record<RedFlagCode, string> = {
  LOCATION_OR_AUTHORIZATION: 'Location or work permit limit',
  TIMEZONE_MISMATCH: 'Time-zone mismatch',
  UNPAID_TRIAL_WORK: 'Unpaid trial work',
  NO_SALARY_INFO: 'No salary listed',
  SALARY_BELOW_MINIMUM: 'Below your minimum salary',
  STALE_POSTING: 'Old posting',
  BLOCKED_COMPANY: 'Company on your avoid list',
  OTHER: 'Heads-up',
};

/**
 * Section "Red flags" (TestIds.copilot.redFlags). Each row (TestIds.copilot.redFlag(i)):
 * TriangleAlert 16 warningIcon + title (bodyStrong) + detail (body, textSecondary).
 * Empty list → single line "No red flags found" with ShieldCheck 16 successIcon.
 */
export function RedFlagList({ flags }: { flags: RedFlag[] }) {
  const { colors } = useTheme();
  return (
    <View testID={TestIds.copilot.redFlags} style={styles.section}>
      <Text style={[styles.heading, { color: colors.textPrimary }]}>Red flags</Text>
      {flags.length === 0 ? (
        <View style={styles.row}>
          <ShieldCheck size={iconSizes.sm} strokeWidth={iconStrokeWidth} color={colors.successIcon} accessible={false} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>No red flags found</Text>
        </View>
      ) : (
        flags.map((flag, index) => (
          <View key={`${flag.code}-${index}`} testID={TestIds.copilot.redFlag(index)} style={styles.row}>
            <TriangleAlert size={iconSizes.sm} strokeWidth={iconStrokeWidth} color={colors.warningIcon} accessible={false} />
            <View style={styles.copy}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{RED_FLAG_TITLES[flag.code]}</Text>
              <Text style={[styles.detail, { color: colors.textSecondary }]}>{flag.detail}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  heading: {
    ...typography.headline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodyStrong,
  },
  detail: {
    ...typography.body,
  },
});
