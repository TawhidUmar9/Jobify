import { Text, View } from 'react-native';

import { TestIds } from '../../../constants/testIds';

/**
 * Settings → Edit resume ([id] param). ResumeContentForm; "Save" (TestIds.resumes.editSave) →
 * updateResume → back. DUPLICATE_LABEL → "A resume with this name exists". not found → StateView.
 */
export default function ResumeEditScreen() {
  // TODO(T-039): implement per the rules above.
  return (
    <View testID={TestIds.resumes.editSave}>
      <Text>ResumeEditScreen</Text>
    </View>
  );
}
