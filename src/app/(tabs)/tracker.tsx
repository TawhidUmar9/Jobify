import { router, Stack } from 'expo-router';
import { ChartColumn } from 'lucide-react-native';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { APPLICATION_ROW_HEIGHT, ApplicationRow } from '../../components/tracker/ApplicationRow';
import { FollowUpsSection } from '../../components/tracker/FollowUpsSection';
import { IconButton } from '../../components/ui/IconButton';
import { StateView } from '../../components/ui/StateView';
import { TestIds } from '../../constants/testIds';
import { useApplications } from '../../features/tracker/useApplications';
import { useTheme } from '../../theme/ThemeProvider';
import type { Application } from '../../types/domain';

/**
 * Tracker ("/tracker"). UI_DIRECTIVES.md §4.5.
 * Header right: IconButton ChartColumn "Insights" (TestIds.tracker.insightsButton) → router.push('/insights').
 * loading / error (Try again) / empty ("No applications yet" / "Analyze a job page in Workspace and tap Log
 * to track it here." + "Go to Workspace") / ready: FlatList with ListHeaderComponent = FollowUpsSection,
 * getItemLayout APPLICATION_ROW_HEIGHT, RefreshControl. Row press → router.push(`/application/${id}`).
 */
export default function TrackerScreen() {
  const { colors } = useTheme();
  const { status, applications, followUpsDue, refreshing, refresh } = useApplications();

  const openApplication = (application: Application) => router.push(`/application/${application.id}`);

  let body;
  if (status === 'loading') {
    body = <StateView kind="loading" message="Loading applications…" testID={TestIds.tracker.loading} />;
  } else if (status === 'error') {
    body = (
      <StateView
        kind="error"
        title="Could not load applications"
        message="The local database did not respond."
        actionLabel="Try again"
        onAction={refresh}
        testID={TestIds.tracker.error}
        actionTestID={TestIds.tracker.retry}
      />
    );
  } else if (applications.length === 0) {
    body = (
      <StateView
        kind="empty"
        title="No applications yet"
        message="Analyze a job page in Workspace and tap Log to track it here."
        actionLabel="Go to Workspace"
        onAction={() => router.push('/')}
        testID={TestIds.tracker.empty}
      />
    );
  } else {
    body = (
      <FlatList
        testID={TestIds.tracker.list}
        style={styles.list}
        data={applications}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={<FollowUpsSection due={followUpsDue} onOpen={openApplication} />}
        renderItem={({ item }) => <ApplicationRow application={item} onPress={openApplication} />}
        getItemLayout={(_, index) => ({
          length: APPLICATION_ROW_HEIGHT,
          offset: APPLICATION_ROW_HEIGHT * index,
          index,
        })}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID={TestIds.tracker.screen}>
      <Stack.Screen
        options={{
          title: 'Tracker',
          headerRight: () => (
            <IconButton
              icon={ChartColumn}
              accessibilityLabel="Insights"
              onPress={() => router.push('/insights')}
              testID={TestIds.tracker.insightsButton}
            />
          ),
        }}
      />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
});
