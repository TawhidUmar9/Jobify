import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { radii, spacing, typography } from '../../theme/tokens';

export interface WeeklyBarsProps {
  weeks: { weekStart: string; count: number }[];
  testID: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function formatWeekLabel(weekStart: string): string {
  const parts = weekStart.split('-');
  if (parts.length < 3) return weekStart;
  const day = Number(parts[2]);
  const monthIdx = Number(parts[1]) - 1;
  return `${day} ${MONTHS[monthIdx] ?? ''}`;
}

const CHART_HEIGHT = 100;

/**
 * 8 vertical bars (Views, no chart library): height proportional to count (max = tallest, min 2px),
 * colors.primary, label under each ("12 Oct", caption). Container accessibilityLabel lists every week:
 * "Applications per week: 12 Oct 3, 19 Oct 5, …". Zero data → caption "No applications in the last 8 weeks".
 */
export function WeeklyBars({ weeks, testID }: WeeklyBarsProps) {
  const { colors } = useTheme();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const allZero = weeks.length === 0 || weeks.every((w) => w.count === 0);
  const maxCount = Math.max(...weeks.map((w) => w.count), 1);

  const accSummary = weeks
    .map((w) => `${formatWeekLabel(w.weekStart)} ${w.count}`)
    .join(', ');

  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`Applications per week: ${accSummary}`}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>Applications per week</Text>

      {allZero ? (
        <Text style={[styles.zeroCaption, { color: colors.textSecondary }]}>
          No applications in the last 8 weeks
        </Text>
      ) : null}

      <View style={styles.chartContainer}>
        {weeks.map((week, idx) => {
          const height =
            week.count > 0 ? Math.max(2, Math.round((week.count / maxCount) * (CHART_HEIGHT - 24))) : 2;
          const isSelected = selectedIdx === idx;

          return (
            <Pressable
              key={week.weekStart}
              style={styles.column}
              onPress={() => setSelectedIdx(isSelected ? null : idx)}
              accessibilityRole="button"
              accessibilityLabel={`${formatWeekLabel(week.weekStart)}: ${week.count} applications`}
            >
              <View style={styles.barArea}>
                {isSelected ? (
                  <View style={[styles.tooltip, { backgroundColor: colors.inverseSurface }]}>
                    <Text style={[styles.tooltipText, { color: colors.onInverseSurface }]}>
                      {week.count}
                    </Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.bar,
                    {
                      height,
                      backgroundColor: colors.primary,
                      opacity: isSelected ? 1 : 0.85,
                    },
                  ]}
                />
              </View>
              <Text numberOfLines={1} style={[styles.label, { color: colors.textSecondary }]}>
                {formatWeekLabel(week.weekStart)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  title: {
    ...typography.headline,
  },
  zeroCaption: {
    ...typography.caption,
    textAlign: 'center',
    marginVertical: spacing.xs,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: CHART_HEIGHT,
    paddingTop: spacing.xs,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barArea: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 14,
    borderRadius: radii.sm,
  },
  tooltip: {
    position: 'absolute',
    top: 0,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
    zIndex: 10,
  },
  tooltipText: {
    ...typography.caption,
    fontSize: 10,
  },
  label: {
    ...typography.caption,
    fontSize: 10,
    marginTop: spacing.xs,
  },
});
