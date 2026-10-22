import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

/**
 * Step 1 of 3 ("/onboarding/ai"). UI_DIRECTIVES.md §4.2. ScrollView + KeyboardAvoidingView.
 * Title "Connect an AI provider"; body "Jobify uses your own API key. Gemini has a free tier."
 * AiSettingsForm bound to useAiSettings(). Footer: ghost "Skip for now" (TestIds.onboarding.skip,
 * caption "You can browse and track without AI") → /onboarding/profile without saving;
 * primary "Continue" (next) → save(); ok → router.push('/onboarding/profile'); invalid → field errors.
 * Continue does not require a successful test.
 */
export default function OnboardingAiScreen() {
  // TODO(T-018): implement per the rules above.
  return (
    <View testID={TestIds.onboarding.aiScreen}>
      <Text>OnboardingAiScreen</Text>
    </View>
  );
}
