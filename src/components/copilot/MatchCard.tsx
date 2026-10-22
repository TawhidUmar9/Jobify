import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
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
  // TODO(T-029): implement per the rules above.
  return (
    <View testID={TestIds.copilot.matchCard}>
      <Text testID={TestIds.copilot.matchScore}>{score}</Text>
      <Text testID={TestIds.copilot.recommendedResume}>{resume?.label ?? 'No resume'}</Text>
      <Text>{reason}</Text>
    </View>
  );
}
