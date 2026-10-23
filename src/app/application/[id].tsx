import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EligibilityBadge } from '../../components/copilot/EligibilityBadge';
import { RedFlagList } from '../../components/copilot/RedFlagList';
import { formatTrackerDate } from '../../components/tracker/ApplicationRow';
import {
  FollowUpPicker,
  followUpAtFromOption,
  type FollowUpOptionKey,
} from '../../components/tracker/FollowUpPicker';
import { StatusChip } from '../../components/tracker/StatusChip';
import { StatusPicker } from '../../components/tracker/StatusPicker';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useSnackbar } from '../../components/ui/Snackbar';
import { StateView } from '../../components/ui/StateView';
import { TextField } from '../../components/ui/TextField';
import { TestIds } from '../../constants/testIds';
import { useApplication } from '../../features/tracker/useApplication';
import { parseDbTimestamp } from '../../lib/dates';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, radii, spacing, typography } from '../../theme/tokens';
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from '../../types/domain';

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
  const { show } = useSnackbar();
  const { status, application, update, remove } = useApplication(id);

  const [statusPickerVisible, setStatusPickerVisible] = useState(false);
  const [followUpPickerVisible, setFollowUpPickerVisible] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [userNotes, setUserNotes] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [now] = useState(() => Date.now());

  if (status === 'loading') {
    return <StateView kind="loading" message="Loading application…" />;
  }

  if (status === 'not_found' || !application) {
    return (
      <StateView
        kind="empty"
        title="Application not found"
        message="It may have been deleted."
        actionLabel="Back to Tracker"
        onAction={() => router.back()}
        testID={TestIds.detail.notFound}
      />
    );
  }

  if (status === 'error') {
    return (
      <StateView
        kind="error"
        title="Could not load this application"
        message="The local database did not respond."
        actionLabel="Try again"
        onAction={() => router.back()}
      />
    );
  }

  const notes = userNotes !== null ? userNotes : application.notes;
  const notesChanged = userNotes !== null && userNotes !== application.notes;

  const handleStatusSelect = async (newStatus: ApplicationStatus) => {
    setStatusPickerVisible(false);
    const ok = await update({ status: newStatus });
    if (ok) {
      show(`Status changed to ${APPLICATION_STATUS_LABELS[newStatus]}`);
    } else {
      show('Could not save');
    }
  };

  const handleFollowUpSelect = async (key: FollowUpOptionKey) => {
    setFollowUpPickerVisible(false);
    const targetAt = followUpAtFromOption(key, new Date(now));
    const ok = await update({ followUpAt: targetAt });
    if (ok) {
      show('Reminder updated');
    } else {
      show('Could not save');
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const ok = await update({ notes });
    setSavingNotes(false);
    if (ok) {
      setUserNotes(null);
      show('Notes saved');
    } else {
      show('Could not save');
    }
  };

  const handleDeleteConfirm = async () => {
    setConfirmDeleteVisible(false);
    const ok = await remove();
    if (ok) {
      router.back();
      show('Application deleted');
    } else {
      show('Could not save');
    }
  };

  let followUpLabel = 'No reminder';
  let isOverdue = false;
  if (application.followUpAt) {
    const due = parseDbTimestamp(application.followUpAt);
    if (due) {
      const diffMs = due.getTime() - now;
      const diffDays = Math.ceil(diffMs / 86400000);
      if (diffDays <= 0) {
        followUpLabel = 'Follow-up: overdue';
        isOverdue = true;
      } else {
        followUpLabel = `Follow-up: in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
      }
    }
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.container}
      testID={TestIds.detail.screen}
    >
      {/* 1. Company, Role, Meta */}
      <View style={styles.section}>
        <Text testID={TestIds.detail.company} maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.company, { color: colors.textPrimary }]}>
          {application.companyName}
        </Text>
        <Text testID={TestIds.detail.role} maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.role, { color: colors.textPrimary }]}>
          {application.roleTitle}
        </Text>
        <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.meta, { color: colors.textSecondary }]}>
          {`${application.boardName} · ${formatTrackerDate(application.createdAt)}`}
        </Text>
      </View>

      {/* 2. Status row */}
      <View style={[styles.row, styles.statusRow]}>
        <StatusChip status={application.status} testID={TestIds.detail.status} />
        <Button
          label="Change status"
          variant="secondary"
          testID={TestIds.detail.changeStatus}
          onPress={() => setStatusPickerVisible(true)}
        />
      </View>

      {/* 3. Follow-up row */}
      <View style={[styles.row, styles.followUpRow]}>
        <Text
          maxFontSizeMultiplier={fontScaleCaps.default}
          style={[
            styles.followUpText,
            { color: isOverdue ? colors.warningText : colors.textPrimary },
          ]}
        >
          {followUpLabel}
        </Text>
        <Button
          label="Change"
          variant="secondary"
          testID={TestIds.detail.followUp}
          onPress={() => setFollowUpPickerVisible(true)}
        />
      </View>

      {/* 4. Eligibility & Red flags */}
      {application.eligibility ? (
        <View style={styles.section}>
          <EligibilityBadge eligibility={application.eligibility} reason="" />
        </View>
      ) : null}

      {application.redFlags.length > 0 ? (
        <View style={styles.section}>
          <RedFlagList flags={application.redFlags} />
        </View>
      ) : null}

      {/* 5. Resume & Match */}
      {application.resumeLabel || application.matchScore !== null ? (
        <View style={styles.section}>
          <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.body, { color: colors.textPrimary }]}>
            {application.resumeLabel ? `Resume: ${application.resumeLabel}` : ''}
            {application.resumeLabel && application.matchScore !== null ? ' · ' : ''}
            {application.matchScore !== null ? `Match ${application.matchScore}` : ''}
          </Text>
        </View>
      ) : null}

      {/* 6. Notes */}
      <View style={styles.section}>
        <TextField
          label="Notes"
          multiline
          numberOfLines={4}
          maxLength={5000}
          value={notes}
          onChangeText={setUserNotes}
          testID={TestIds.detail.notes}
        />
        <View style={styles.saveNotesWrapper}>
          <Button
            label="Save notes"
            disabled={!notesChanged || savingNotes}
            loading={savingNotes}
            testID={TestIds.detail.saveNotes}
            onPress={handleSaveNotes}
          />
        </View>
      </View>

      {/* 7. Cover note & Cold DM */}
      {application.coverNote ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.subhead, { color: colors.textPrimary }]}>Cover note</Text>
          <Text testID={TestIds.detail.coverNote} maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.cardBody, { color: colors.textPrimary }]}>
            {application.coverNote}
          </Text>
          <View style={styles.cardAction}>
            <Button
              label="Copy"
              variant="secondary"
              testID={TestIds.detail.copyCoverNote}
              onPress={() => {
                void Clipboard.setStringAsync(application.coverNote!);
                show('Copied');
              }}
            />
          </View>
        </View>
      ) : null}

      {application.coldDm ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.subhead, { color: colors.textPrimary }]}>Cold DM</Text>
          <Text testID={TestIds.detail.coldDm} maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.cardBody, { color: colors.textPrimary }]}>
            {application.coldDm}
          </Text>
          <View style={styles.cardAction}>
            <Button
              label="Copy"
              variant="secondary"
              testID={TestIds.detail.copyDm}
              onPress={() => {
                void Clipboard.setStringAsync(application.coldDm!);
                show('Copied');
              }}
            />
          </View>
        </View>
      ) : null}

      {/* 8. Open job post */}
      <View style={styles.actionSection}>
        <Button
          label="Open job post"
          testID={TestIds.detail.openJob}
          onPress={() => router.navigate({ pathname: '/', params: { url: application.jobUrl } })}
        />
      </View>

      {/* 9. Delete */}
      <View style={styles.actionSection}>
        <Button
          label="Delete"
          variant="ghost"
          testID={TestIds.detail.delete}
          onPress={() => setConfirmDeleteVisible(true)}
        />
      </View>

      {/* Modals & Dialogs */}
      <StatusPicker
        visible={statusPickerVisible}
        current={application.status}
        onSelect={handleStatusSelect}
        onCancel={() => setStatusPickerVisible(false)}
      />

      <FollowUpPicker
        visible={followUpPickerVisible}
        onSelect={handleFollowUpSelect}
        onCancel={() => setFollowUpPickerVisible(false)}
      />

      <ConfirmDialog
        visible={confirmDeleteVisible}
        title="Delete application"
        message="Delete this application from Tracker? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDeleteVisible(false)}
      />
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
  section: {
    gap: spacing.xs,
  },
  company: {
    ...typography.title,
  },
  role: {
    ...typography.headline,
  },
  meta: {
    ...typography.body,
  },
  body: {
    ...typography.body,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  statusRow: {
    paddingVertical: spacing.xs,
  },
  followUpRow: {
    paddingVertical: spacing.xs,
  },
  followUpText: {
    ...typography.bodyStrong,
  },
  saveNotesWrapper: {
    alignItems: 'flex-start',
    marginTop: spacing.xs,
  },
  card: {
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  subhead: {
    ...typography.bodyStrong,
  },
  cardBody: {
    ...typography.body,
  },
  cardAction: {
    alignItems: 'flex-start',
    marginTop: spacing.xs,
  },
  actionSection: {
    marginTop: spacing.xs,
  },
});
