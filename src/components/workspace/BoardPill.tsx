import { Pressable, Text } from 'react-native';

import { TestIds } from '../../constants/testIds';
import type { JobBoard } from '../../types/domain';

export interface BoardPillProps {
  board: JobBoard;
  active: boolean;
  onPress: (board: JobBoard) => void;
}

/**
 * Height 36 visual, hitSlop 6 top/bottom (48 hit), padding 16, radius pill. Inactive: surfaceMuted /
 * textPrimary. Active: primary / onPrimary. typography.label, 1 line, fontScaleCaps.compact.
 * role "tab", selected state, accessibilityLabel `${board.name} job board`,
 * testID TestIds.workspace.boardPill(board.id).
 */
export function BoardPill({ board, active, onPress }: BoardPillProps) {
  // TODO(T-023): implement per the rules above.
  return (
    <Pressable
      testID={TestIds.workspace.boardPill(board.id)}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${board.name} job board`}
      onPress={() => onPress(board)}
    >
      <Text>{board.name}</Text>
    </Pressable>
  );
}
