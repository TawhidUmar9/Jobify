import { FileText } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { iconSizes, iconStrokeWidth, radii, spacing, typography } from '../../theme/tokens';
import type { Resume } from '../../types/domain';

export interface MatchCardProps {
  score: number;
  resume: Resume | null;
  reason: string;
}

/**
 * Card (surfaceMuted, radius md, padding 16, TestIds.copilot.matchCard): score (typography.score,
 * TestIds.copilot.matchScore, label `Match ${score} percent`) + "match"; FileText 20 + resume.label
 * (bodyStrong) + resume.fileName ?? "Text-only resume" (caption) (TestIds.copilot.recommendedResume);
 * resume null → "Add a resume in Settings to get a recommendation". Reason below.
 */
export function MatchCard({ score, resume, reason }: MatchCardProps) {
  const { colors } = useTheme();
  return (
    <View testID={TestIds.copilot.matchCard} style={[styles.card, { backgroundColor: colors.surfaceMuted }]}>
      <Text
        testID={TestIds.copilot.matchScore}
        accessibilityLabel={`Match ${score} percent`}
        style={[styles.score, { color: colors.textPrimary }]}
      >
        {score} <Text style={[styles.matchWord, { color: colors.textSecondary }]}>match</Text>
      </Text>
      <View testID={TestIds.copilot.recommendedResume} style={styles.resume}>
        {resume ? (
          <>
            <FileText size={iconSizes.md} strokeWidth={iconStrokeWidth} color={colors.textSecondary} accessible={false} />
            <View style={styles.resumeCopy}>
              <Text style={[styles.resumeLabel, { color: colors.textPrimary }]}>{resume.label}</Text>
              <Text style={[styles.fileName, { color: colors.textSecondary }]}>{resume.fileName ?? 'Text-only resume'}</Text>
            </View>
          </>
        ) : (
          <Text style={[styles.resumeLabel, { color: colors.textPrimary }]}>
            Add a resume in Settings to get a recommendation
          </Text>
        )}
      </View>
      <Text style={[styles.reason, { color: colors.textSecondary }]}>{reason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  score: {
    ...typography.score,
  },
  matchWord: {
    ...typography.body,
  },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  resumeCopy: {
    flex: 1,
  },
  resumeLabel: {
    ...typography.bodyStrong,
  },
  fileName: {
    ...typography.caption,
  },
  reason: {
    ...typography.body,
  },
});
