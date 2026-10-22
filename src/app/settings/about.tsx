import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

/**
 * Settings → About. App name + version (expo-constants expoConfig.version); one-paragraph privacy statement
 * (UI_DIRECTIVES §6 "Privacy statement"); "Source code" link (about.sourceLink) → the repository URL in
 * app.json expo.extra.repositoryUrl via Linking; license name; "Open-source licenses" (about.licenses) →
 * opens the LICENSES.md URL in the repo. No analytics, no update checks.
 */
export default function AboutScreen() {
  // TODO(T-043): implement per the rules above.
  return (
    <View testID={TestIds.about.screen}>
      <Text>AboutScreen</Text>
    </View>
  );
}
