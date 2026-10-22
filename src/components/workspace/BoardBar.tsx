import { useEffect, useRef } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import type { JobBoard } from '../../types/domain';
import { BoardPill } from './BoardPill';

export interface BoardBarProps {
  boards: JobBoard[];
  /** null when a shared/typed link is open. */
  activeBoardId: number | null;
  onSelect: (board: JobBoard) => void;
}

/** Bar height from UI_DIRECTIVES §4.1. */
const BAR_HEIGHT = 56;

/**
 * Horizontal scrollable pills. UI_DIRECTIVES.md §4.1 "Board bar".
 * Height 56, gutters 16, gap 8, bg surface, bottom hairline border. Scrolls the active pill into view
 * (animated unless reduce motion). role "tablist". Empty `boards` → render nothing (the screen shows
 * TestIds.workspace.emptyBoards with "Add a job board in Settings").
 */
export function BoardBar({ boards, activeBoardId, onSelect }: BoardBarProps) {
  const { colors } = useTheme();
  const scroller = useRef<ScrollViewInstance | null>(null);
  const offsets = useRef<Record<number, number>>({});

  useEffect(() => {
    if (activeBoardId === null) return;
    const x = offsets.current[activeBoardId];
    if (x === undefined) return;
    const pending = AccessibilityInfo.isReduceMotionEnabled();
    const scroll = (reduce: boolean) => {
      scroller.current?.scrollTo({ x: Math.max(0, x - spacing.md), animated: !reduce });
    };
    if (typeof pending?.then === 'function') {
      pending.then(scroll).catch(() => scroll(false));
      return;
    }
    scroll(false);
  }, [activeBoardId, boards]);

  if (boards.length === 0) return null;

  return (
    <ScrollView
      ref={scroller}
      horizontal
      testID={TestIds.workspace.boardBar}
      accessibilityRole="tablist"
      style={[styles.bar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      contentContainerStyle={styles.content}
    >
      {boards.map((board) => (
        <View
          key={board.id}
          onLayout={(event) => {
            offsets.current[board.id] = event.nativeEvent.layout.x;
          }}
        >
          <BoardPill board={board} active={board.id === activeBoardId} onPress={onSelect} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: BAR_HEIGHT,
    borderBottomWidth: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
});
