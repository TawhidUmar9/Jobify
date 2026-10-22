import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

/**
 * Settings → Profile. ProfileForm bound to useProfileData(). "Save" (TestIds.profileForm.save):
 * validateProfile → saveProfile → snackbar "Profile saved". Unsaved changes + back → ConfirmDialog
 * "Discard changes?".
 */
export default function ProfileSettingsScreen() {
  // TODO(T-039): implement per the rules above.
  return (
    <View testID={TestIds.profileForm.save}>
      <Text>ProfileSettingsScreen</Text>
    </View>
  );
}
