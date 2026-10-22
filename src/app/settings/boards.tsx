import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

/**
 * Settings → Job boards. UI_DIRECTIVES.md §4.3. Rows (boards.row(id)): name + host; trailing IconButtons
 * ArrowUp (boards.moveUp(id), disabled on first), ArrowDown (moveDown, disabled on last), Trash2 (delete →
 * ConfirmDialog). Tap row → BoardForm (edit). "Add board" (boards.add) → BoardForm (add).
 * Reorder writes immediately (reorderBoards). Changes show in Workspace on its next focus.
 */
export default function BoardsSettingsScreen() {
  // TODO(T-040): implement per the rules above.
  return (
    <View testID={TestIds.boards.screen}>
      <Text>BoardsSettingsScreen</Text>
    </View>
  );
}
