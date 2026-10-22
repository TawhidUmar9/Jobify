import { ScrollView } from 'react-native';

import { TestIds } from '../../constants/testIds';
import type { JobBoard } from '../../types/domain';
import { BoardPill } from './BoardPill';

export interface BoardBarProps {
  boards: JobBoard[];
  /** null when a shared/typed link is open. */
  activeBoardId: number | null;
  onSelect: (board: JobBoard) => void;
}

/**
 * Horizontal scrollable pills. UI_DIRECTIVES.md §4.1 "Board bar".
 * Height 56, gutters 16, gap 8, bg surface, bottom hairline border. Scrolls the active pill into view
 * (animated unless reduce motion). role "tablist". Empty `boards` → render nothing (the screen shows
 * TestIds.workspace.emptyBoards with "Add a job board in Settings").
 */
export function BoardBar({ boards, activeBoardId, onSelect }: BoardBarProps) {
  // TODO(T-023): implement per the rules above.
  return (
    <ScrollView horizontal testID={TestIds.workspace.boardBar}>
      {boards.map((board) => (
        <BoardPill key={board.id} board={board} active={board.id === activeBoardId} onPress={onSelect} />
      ))}
    </ScrollView>
  );
}
