import { Text, View } from 'react-native';

import { TestIds } from '../constants/testIds';

/**
 * Insights ("/insights"). UI_DIRECTIVES.md §4.7. useInsights().
 * Empty (total 0) → StateView empty (TestIds.insights.empty) "No data yet" / "Log a few applications first."
 * Ready: tiles row 1: Applications (total), Response rate (responses/applied, "8 of 42"); row 2:
 * Interview rate, Offers. Then WeeklyBars (weekly), RateTable By resume (byResume), By job board (byBoard).
 * Footer caption: "Response = interview, offer or rejection. Calculated on this device."
 */
export default function InsightsScreen() {
  // TODO(T-038): implement per the rules above.
  return (
    <View testID={TestIds.insights.screen}>
      <Text>InsightsScreen</Text>
    </View>
  );
}
