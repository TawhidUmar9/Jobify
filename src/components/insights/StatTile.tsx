import { Text, View } from 'react-native';

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
  // TODO(T-038): implement.
  return (
    <View testID={props.testID} accessible accessibilityLabel={`${props.label}: ${props.value}`}>
      <Text>{props.value}</Text>
      <Text>{props.label}</Text>
    </View>
  );
}
