import { FileQuestion } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, iconSizes, iconStrokeWidth, radii, spacing, typography } from '../../theme/tokens';

/**
 * Rendered when AI analysis detects the current page is not a job post.
 * DECISIONS.md D-008, UI_DIRECTIVES.md §4.4, §6.
 * TestId: copilot-not-job.
 * Icon: lucide FileQuestion.
 * Title: "This doesn't look like a job post".
 * Body: "Open a single job and tap Analyze again. Login pages, search results and home pages can't be checked.".
 */
export function NotJobPostCard() {
  const { colors } = useTheme();

  return (
    <View
      testID={TestIds.copilot.notJob}
      accessibilityRole="summary"
      style={[styles.card, { backgroundColor: colors.surfaceMuted }]}
    >
      <View style={styles.header}>
        <FileQuestion
          size={iconSizes.lg}
          strokeWidth={iconStrokeWidth}
          color={colors.textSecondary}
          accessible={false}
          importantForAccessibility="no"
        />
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          maxFontSizeMultiplier={fontScaleCaps.default}
        >
          {"This doesn't look like a job post"}
        </Text>
      </View>
      <Text
        style={[styles.body, { color: colors.textSecondary }]}
        maxFontSizeMultiplier={fontScaleCaps.default}
      >
        {"Open a single job and tap Analyze again. Login pages, search results and home pages can't be checked."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.headline,
    flex: 1,
  },
  body: {
    ...typography.body,
  },
});
