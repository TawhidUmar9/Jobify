import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

/**
 * Settings → Job preferences. PreferencesForm bound to useProfileData(). "Save" (TestIds.preferencesForm.save)
 * → snackbar "Preferences saved".
 */
export default function PreferencesSettingsScreen() {
  // TODO(T-039): implement per the rules above.
  return (
    <View testID={TestIds.preferencesForm.save}>
      <Text>PreferencesSettingsScreen</Text>
    </View>
  );
}
