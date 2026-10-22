import { Text, View } from 'react-native';

export interface WeeklyBarsProps {
  weeks: { weekStart: string; count: number }[];
  testID: string;
}

/**
 * 8 vertical bars (Views, no chart library): height proportional to count (max = tallest, min 2px),
 * colors.primary, label under each ("12 Oct", caption). Container accessibilityLabel lists every week:
 * "Applications per week: 12 Oct 3, 19 Oct 5, …". Zero data → caption "No applications in the last 8 weeks".
 */
export function WeeklyBars({ weeks, testID }: WeeklyBarsProps) {
  // TODO(T-038): implement per the rules above.
  return (
    <View testID={testID}>
      <Text>{weeks.length}</Text>
    </View>
  );
}
