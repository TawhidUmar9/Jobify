import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RateTable } from '../components/insights/RateTable';
import { StatTile } from '../components/insights/StatTile';
import { WeeklyBars } from '../components/insights/WeeklyBars';
import { StateView } from '../components/ui/StateView';
import { TestIds } from '../constants/testIds';
import { useInsights } from '../features/insights/useInsights';
import { useTheme } from '../theme/ThemeProvider';
import { spacing, typography } from '../theme/tokens';

/**
 * Insights ("/insights"). UI_DIRECTIVES.md §4.7, T-046f G4. useInsights().
 * Empty (applied 0) → StateView empty (TestIds.insights.empty) "No data yet" / "Log a few applications first."
 * Ready: tiles row 1: Applications (applied count, caption "N saved for later" if saved > 0),
 * Response rate (responses/applied, "8 of 42"); row 2:
 * Interview rate, Offers. Then WeeklyBars (weekly), RateTable By resume (byResume), By job board (byBoard).
 * Footer caption: "Response = interview, offer or rejection. Calculated on this device."
 */
export default function InsightsScreen() {
  const { colors } = useTheme();
  const { status, summary, reload } = useInsights();

  if (status === 'loading') {
    return <StateView kind="loading" message="Loading insights…" />;
  }

  if (status === 'error' || !summary) {
    return (
      <StateView
        kind="error"
        title="Could not load insights"
        message="The local database did not respond."
        actionLabel="Try again"
        onAction={reload}
      />
    );
  }

  if (summary.applied === 0) {
    return (
      <StateView
        kind="empty"
        title="No data yet"
        message="Log a few applications first."
        testID={TestIds.insights.empty}
      />
    );
  }

  const savedCount = summary.byStatus.SAVED ?? 0;
  const savedCaption =
    savedCount > 0 ? `${savedCount} saved for later` : undefined;

  const responsePct =
    summary.applied > 0 ? `${Math.round((100 * summary.responses) / summary.applied)}%` : '0%';
  const responseCaption =
    summary.applied > 0 ? `${summary.responses} of ${summary.applied}` : undefined;

  const interviewPct =
    summary.applied > 0 ? `${Math.round((100 * summary.interviews) / summary.applied)}%` : '0%';
  const interviewCaption =
    summary.applied > 0 ? `${summary.interviews} of ${summary.applied}` : undefined;

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.container}
      testID={TestIds.insights.screen}
    >
      {/* Row 1: Applications, Response rate */}
      <View style={styles.tileRow}>
        <StatTile
          label="Applications"
          value={String(summary.applied)}
          caption={savedCaption}
          testID={TestIds.insights.total}
        />
        <StatTile
          label="Response rate"
          value={responsePct}
          caption={responseCaption}
          testID={TestIds.insights.responseRate}
        />
      </View>

      {/* Row 2: Interview rate, Offers */}
      <View style={styles.tileRow}>
        <StatTile
          label="Interview rate"
          value={interviewPct}
          caption={interviewCaption}
          testID={TestIds.insights.interviewRate}
        />
        <StatTile
          label="Offers"
          value={String(summary.byStatus.OFFER ?? 0)}
          testID="insights-offers"
        />
      </View>

      {/* WeeklyBars */}
      <WeeklyBars weeks={summary.appliedPerWeek} testID={TestIds.insights.weekly} />

      {/* RateTable: By resume */}
      <RateTable
        title="By resume"
        rows={summary.byResume}
        testID={TestIds.insights.byResume}
      />

      {/* RateTable: By job board */}
      <RateTable
        title="By job board"
        rows={summary.byBoard}
        testID={TestIds.insights.byBoard}
      />

      {/* Footer caption */}
      <Text style={[styles.footerCaption, { color: colors.textSecondary }]}>
        Response = interview, offer or rejection. Calculated on this device.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  tileRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  footerCaption: {
    ...typography.caption,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
});
