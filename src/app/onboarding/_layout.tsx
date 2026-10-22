import { Stack } from 'expo-router';

import { useTheme } from '../../theme/ThemeProvider';

/** Onboarding stack: index (welcome) → ai → profile → preferences. Headers hidden; screens own a
 *  step indicator "Step N of 3" (TestIds.onboarding.stepIndicator) on ai/profile/preferences. */
export default function OnboardingLayout() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
