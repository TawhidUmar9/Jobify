import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

/**
 * Settings → Answer bank. FlatList rows (answers.row(id)): question (bodyStrong, 2 lines) + answer
 * (body, 2 lines, textSecondary) + "Used N times" caption; tap → AnswerForm edit; Trash2 → ConfirmDialog.
 * "Add answer" (answers.add). Empty (answers.empty): "No saved answers" / "Save AI drafts from the copilot,
 * or add answers you reuse, like notice period or salary expectations."
 */
export default function AnswersSettingsScreen() {
  // TODO(T-041): implement per the rules above.
  return (
    <View testID={TestIds.answers.screen}>
      <Text>AnswersSettingsScreen</Text>
    </View>
  );
}
