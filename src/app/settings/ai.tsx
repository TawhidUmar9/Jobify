import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

/**
 * Settings → AI provider. UI_DIRECTIVES.md §4.3. AiSettingsForm bound to useAiSettings().
 * Primary "Save" (TestIds.aiForm.save) → save() → snackbar "AI settings saved" + router.back().
 * When hasSaved: destructive ghost "Remove key and settings" (TestIds.aiForm.remove) → ConfirmDialog → remove().
 */
export default function AiSettingsScreen() {
  // TODO(T-039): implement per the rules above.
  return (
    <View testID={TestIds.aiForm.save}>
      <Text>AiSettingsScreen</Text>
    </View>
  );
}
