import { Pressable, StyleSheet, Text } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, radii, spacing, typography } from '../../theme/tokens';
import type { JobBoard } from '../../types/domain';

export interface BoardPillProps {
  board: JobBoard;
  active: boolean;
  onPress: (board: JobBoard) => void;
}

/** Visual height from UI_DIRECTIVES (36) plus 6pt hitSlop so the target is 48. */
const PILL_HEIGHT = 36;
const PILL_HIT_SLOP = 6;

/**
 * Height 36 visual, hitSlop 6 top/bottom (48 hit), padding 16, radius pill. Inactive: surfaceMuted /
 * textPrimary. Active: primary / onPrimary. typography.label, 1 line, fontScaleCaps.compact.
 * role "tab", selected state, accessibilityLabel `${board.name} job board`,
 * testID TestIds.workspace.boardPill(board.id).
 */
export function BoardPill({ board, active, onPress }: BoardPillProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={TestIds.workspace.boardPill(board.id)}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${board.name} job board`}
      hitSlop={{ top: PILL_HIT_SLOP, bottom: PILL_HIT_SLOP }}
      onPress={() => onPress(board)}
      style={[
        styles.pill,
        { backgroundColor: active ? colors.primary : colors.surfaceMuted },
      ]}
    >
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={fontScaleCaps.compact}
        style={[styles.label, { color: active ? colors.onPrimary : colors.textPrimary }]}
      >
        {board.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: PILL_HEIGHT,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.label,
  },
});
