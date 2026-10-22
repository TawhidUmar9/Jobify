import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { radii, spacing, typography } from '../../theme/tokens';
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
  const { colors } = useTheme();

  if (rows.length === 0) return null;

  return (
    <View testID={testID} style={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.thKey, { color: colors.textSecondary }]}>
            {title === 'By resume' ? 'Resume' : 'Job board'}
          </Text>
          <Text style={[styles.th, { color: colors.textSecondary }]}>Applied</Text>
          <Text style={[styles.th, { color: colors.textSecondary }]}>Resp %</Text>
          <Text style={[styles.th, { color: colors.textSecondary }]}>Int %</Text>
        </View>

        {rows.map((row) => {
          const isTooFew = row.applied < 3;
          const resp = row.applied > 0 ? Math.round((100 * row.responses) / row.applied) : 0;
          const int = row.applied > 0 ? Math.round((100 * row.interviews) / row.applied) : 0;

          const accLabel = isTooFew
            ? `${row.key}: ${row.applied} applied, too few to compare`
            : `${row.key}: ${row.applied} applied, ${resp}% responses, ${int}% interviews`;

          return (
            <View
              key={row.key}
              accessible
              accessibilityLabel={accLabel}
              style={[styles.row, { borderBottomColor: colors.border }]}
            >
              <Text numberOfLines={1} style={[styles.tdKey, { color: colors.textPrimary }]}>
                {row.key}
              </Text>
              <Text style={[styles.td, { color: colors.textPrimary }]}>{row.applied}</Text>
              {isTooFew ? (
                <Text
                  style={[styles.tooFew, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  Too few to compare
                </Text>
              ) : (
                <>
                  <Text style={[styles.td, { color: colors.textPrimary }]}>{resp}%</Text>
                  <Text style={[styles.td, { color: colors.textPrimary }]}>{int}%</Text>
                </>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  title: {
    ...typography.headline,
  },
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
  },
  thKey: {
    flex: 2,
    ...typography.caption,
  },
  th: {
    flex: 1,
    textAlign: 'right',
    ...typography.caption,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
  },
  tdKey: {
    flex: 2,
    ...typography.bodyStrong,
  },
  td: {
    flex: 1,
    textAlign: 'right',
    ...typography.body,
    fontVariant: ['tabular-nums'],
  },
  tooFew: {
    flex: 2,
    textAlign: 'right',
    ...typography.caption,
  },
});
