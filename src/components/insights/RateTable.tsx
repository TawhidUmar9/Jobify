import { Text, View } from 'react-native';

import type { RateRow } from '../../types/domain';

export interface RateTableProps {
  title: 'By resume' | 'By job board';
  rows: RateRow[];
  testID: string;
}

/**
 * Table rows: key (bodyStrong, 1 line) | applied | response % | interview % (tabular numbers).
 * Percentages = round(100 * x / applied); applied 0 → "–". Empty rows → hidden.
 * Each row accessibilityLabel `${key}: ${applied} applied, ${resp}% responses, ${int}% interviews`.
 * Rows with applied < 3 show a caption "Too few to compare" instead of percentages.
 */
export function RateTable({ title, rows, testID }: RateTableProps) {
  // TODO(T-038): implement per the rules above.
  if (rows.length === 0) return null;
  return (
    <View testID={testID}>
      <Text>{title}</Text>
    </View>
  );
}
