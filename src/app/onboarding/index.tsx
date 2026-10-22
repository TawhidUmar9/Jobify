import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

/**
 * Welcome ("/onboarding"). UI_DIRECTIVES.md §4.2.
 * Title "Jobify", subtitle "Your job search, in one place." Three bullets (icons Globe, Sparkles, ListChecks):
 * "Browse job boards with your logins saved", "Check fit, red flags and fill forms with your own AI key",
 * "Track every application on this device". Privacy caption: "No account. No tracking. Your data stays
 * on this phone." Primary "Get started" (TestIds.onboarding.start) → router.push('/onboarding/ai').
 * Ghost "Restore from backup" (restoreBackup) → ConfirmDialog → importBackup; success → markCompleted().
 */
export default function OnboardingWelcomeScreen() {
  // TODO(T-017): implement per the rules above.
  return (
    <View testID={TestIds.onboarding.welcome}>
      <Text>OnboardingWelcomeScreen</Text>
    </View>
  );
}
