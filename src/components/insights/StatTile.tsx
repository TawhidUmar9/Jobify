import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { radii, spacing, typography } from '../../theme/tokens';

export interface StatTileProps {
  label: string;
  /** Pre-formatted, e.g. "42" or "18%". */
  value: string;
  /** e.g. "8 of 42 applications". */
  caption?: string;
  testID: string;
}

/** Tile: surface, radius md, padding 16, value typography.score, label + caption textSecondary. Two per row. */
export function StatTile(props: StatTileProps) {
  const { colors } = useTheme();
  const accLabel = props.caption
    ? `${props.label}: ${props.value}, ${props.caption}`
    : `${props.label}: ${props.value}`;

  return (
    <View
      testID={props.testID}
      accessible
      accessibilityLabel={accLabel}
      style={[styles.tile, { backgroundColor: colors.surface }]}
    >
      <Text style={[styles.value, { color: colors.textPrimary }]}>{props.value}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{props.label}</Text>
      {props.caption ? (
        <Text style={[styles.caption, { color: colors.textSecondary }]}>{props.caption}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.md,
    gap: spacing.xs,
  },
  value: {
    ...typography.score,
  },
  label: {
    ...typography.bodyStrong,
  },
  caption: {
    ...typography.caption,
  },
});
