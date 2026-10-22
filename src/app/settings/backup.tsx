import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

/**
 * Settings → Backup. UI_DIRECTIVES.md §4.3.
 * Export card: "Export a JSON file with your profile, resumes (text), boards, answers and applications.
 * Your API key and resume PDFs are not included. The file is not encrypted — store it safely." +
 * "Export" (backup.export) → exportBackup → share sheet. Import card: "Replaces everything on this device."
 * + "Import" (backup.import) → ConfirmDialog (backup.confirmImport) → importBackup → result line
 * (backup.result) "Imported 2 resumes, 8 boards, 14 answers, 37 applications" or the error copy (§6).
 */
export default function BackupSettingsScreen() {
  // TODO(T-042): implement per the rules above.
  return (
    <View testID={TestIds.backup.screen}>
      <Text>BackupSettingsScreen</Text>
    </View>
  );
}
