import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

/**
 * Step 3 of 3 ("/onboarding/preferences"). UI_DIRECTIVES.md §4.2.
 * Title "What are you looking for?" PreferencesForm. Primary "Finish" (TestIds.onboarding.finish):
 * savePreferences → markCompleted() (the guard switches to the tabs; Workspace opens).
 */
export default function OnboardingPreferencesScreen() {
  // TODO(T-020): implement per the rules above.
  return (
    <View testID={TestIds.onboarding.preferencesScreen}>
      <Text>OnboardingPreferencesScreen</Text>
    </View>
  );
}
