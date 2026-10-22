import { router, Stack } from 'expo-router';
import { FlatList, View } from 'react-native';

import { APPLICATION_ROW_HEIGHT, ApplicationRow } from '../../components/tracker/ApplicationRow';
import { FollowUpsSection } from '../../components/tracker/FollowUpsSection';
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

  // TODO(T-031): states, header button, styling per the rules above.
  const openApplication = (application: Application) => router.push(`/application/${application.id}`);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} testID={TestIds.tracker.screen}>
      <Stack.Screen options={{ title: 'Tracker' }} />
      {status === 'loading' ? (
        <StateView kind="loading" message="Loading applications…" testID={TestIds.tracker.loading} />
      ) : (
        <FlatList
          testID={TestIds.tracker.list}
          data={applications}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={<FollowUpsSection due={followUpsDue} onOpen={openApplication} />}
          renderItem={({ item }) => <ApplicationRow application={item} onPress={openApplication} />}
          getItemLayout={(_, index) => ({ length: APPLICATION_ROW_HEIGHT, offset: APPLICATION_ROW_HEIGHT * index, index })}
          refreshing={refreshing}
          onRefresh={refresh}
        />
      )}
    </View>
  );
}
