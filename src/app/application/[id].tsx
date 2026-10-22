import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import { StateView } from '../../components/ui/StateView';
import { TestIds } from '../../constants/testIds';
import { useApplication } from '../../features/tracker/useApplication';
import { useTheme } from '../../theme/ThemeProvider';

/** Route params for "/application/[id]". CONTRACT: ARCHITECTURE.md §8. */
export type ApplicationDetailParams = {
  id: string;
};

/**
 * Application detail. UI_DIRECTIVES.md §4.6. Sections in order:
 * company (title, detail-company), role (headline, detail-role), meta "Board · 12 Oct 2026";
 * StatusChip (detail-status) + "Change status" (detail-change-status → StatusPicker);
 * "Follow-up: in 3 days" / "No reminder" + "Change" (detail-follow-up → FollowUpPicker);
 * EligibilityBadge + RedFlagList (if any); "Resume: <label>" + "Match 92";
 * Notes TextField multiline (detail-notes) + "Save notes" (detail-save-notes, enabled when changed);
 * cover note block (detail-cover-note + Copy detail-copy-cover-note) and cold DM block (detail-cold-dm +
 * detail-copy-dm) when present; primary "Open job post" (detail-open-job) →
 * router.navigate({ pathname: '/', params: { url: jobUrl } }); ghost destructive "Delete" (detail-delete)
 * → ConfirmDialog → remove() → router.back() + snackbar "Application deleted".
 * Snackbars: "Status changed to <label>", "Reminder updated", "Notes saved", failures "Could not save".
 * States: loading / not_found (application-not-found + "Back to Tracker") / error.
 */
export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<ApplicationDetailParams>();
  const { colors } = useTheme();
  const { status, application } = useApplication(id);

  // TODO(T-037): implement per the rules above.
  if (status === 'loading') {
    return <StateView kind="loading" message="Loading application…" />;
  }
  return (
    <ScrollView style={{ backgroundColor: colors.background }} testID={TestIds.detail.screen}>
      <Text testID={TestIds.detail.company}>{application?.companyName}</Text>
    </ScrollView>
  );
}
