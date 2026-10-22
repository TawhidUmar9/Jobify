import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

/**
 * Settings → Resumes. List of resumes (TestIds.resumes.row(id)): label, file name or "Text only", skills
 * count; tap → /settings/resume/[id]; trailing IconButton Trash2 (resumes.delete(id)) → ConfirmDialog
 * "Delete <label>?" → deleteResume + deleteResumePdf. "Add resume" (resumes.add) opens the same import
 * options as onboarding step 2 (useResumeImport) in a bottom panel; new resumes do NOT overwrite the profile
 * (merge only fills empty profile fields). Empty → "No resumes yet".
 */
export default function ResumesSettingsScreen() {
  // TODO(T-039): implement per the rules above.
  return (
    <View testID={TestIds.resumes.screen}>
      <Text>ResumesSettingsScreen</Text>
    </View>
  );
}
