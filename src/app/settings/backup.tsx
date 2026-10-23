import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useSnackbar } from '../../components/ui/Snackbar';
import { TestIds } from '../../constants/testIds';
import { exportBackup, importBackup, shareBackup, type ImportError } from '../../services/backup';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, radii, spacing, typography } from '../../theme/tokens';

const EXPORT_COPY =
  'Export a JSON file with your profile, resumes (text), boards, answers and applications. Your API key and resume PDFs are not included. The file is not encrypted — store it safely. Saves to your Jobify folder (for example Download/Jobify). The first time, Android asks you to pick it.';

const IMPORT_COPY = 'Replaces everything on this device.';

const IMPORT_ERROR_MESSAGES: Record<Exclude<ImportError, 'CANCELLED'>, string> = {
  UNREADABLE: 'This file could not be read.',
  WRONG_FORMAT: 'This is not a Jobify backup.',
  NEWER_VERSION: 'This backup is from a newer Jobify. Update the app first.',
  DB_ERROR: 'Import failed. Your data was not changed.',
};

/**
 * Settings → Backup. UI_DIRECTIVES.md §4.3.
 * Export card: "Export a JSON file with your profile, resumes (text), boards, answers and applications.
 * Your API key and resume PDFs are not included. The file is not encrypted — store it safely." +
 * "Export" (backup.export) → exportBackup → share sheet. Import card: "Replaces everything on this device."
 * + "Import" (backup.import) → ConfirmDialog (backup.confirmImport) → importBackup → result line
 * (backup.result) "Imported 2 resumes, 8 boards, 14 answers, 37 applications" or the error copy (§6).
 */
export default function BackupSettingsScreen() {
  const { colors } = useTheme();
  const db = useSQLiteContext();
  const snackbar = useSnackbar();

  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const outcome = await exportBackup(db);
      if (outcome.ok) {
        snackbar.show('Backup saved to your Jobify folder.');
      } else {
        if (outcome.error === 'PERMISSION_DENIED') {
          snackbar.show('No folder chosen. The backup was not saved.');
        } else if (outcome.error === 'SHARE_UNAVAILABLE') {
          snackbar.show('Sharing is not available on this device.');
        } else {
          snackbar.show('Could not create the backup file.');
        }
      }
    } finally {
      setExporting(false);
    }
  }

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      const outcome = await shareBackup(db);
      if (!outcome.ok) {
        if (outcome.error === 'SHARE_UNAVAILABLE') {
          snackbar.show('Sharing is not available on this device.');
        } else {
          snackbar.show('Could not create the backup file.');
        }
      }
    } finally {
      setSharing(false);
    }
  }

  async function handleConfirmImport() {
    setConfirmOpen(false);
    if (importing) return;
    setImporting(true);
    try {
      const outcome = await importBackup(db);
      if (!outcome.ok) {
        if (outcome.error !== 'CANCELLED') {
          const msg = IMPORT_ERROR_MESSAGES[outcome.error];
          setResultMessage(msg);
          snackbar.show(msg);
        }
        return;
      }
      const summary = outcome.value;
      const successMsg = `Imported ${summary.resumes} resumes, ${summary.boards} boards, ${summary.answers} answers, ${summary.applications} applications`;
      setResultMessage(successMsg);
      snackbar.show(successMsg);
    } finally {
      setImporting(false);
    }
  }

  return (
    <ScrollView
      testID={TestIds.backup.screen}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text
          maxFontSizeMultiplier={fontScaleCaps.default}
          style={[styles.title, { color: colors.textPrimary }]}
        >
          Export
        </Text>
        <Text
          maxFontSizeMultiplier={fontScaleCaps.default}
          style={[styles.body, { color: colors.textSecondary }]}
        >
          {EXPORT_COPY}
        </Text>
        <View style={styles.actionRow}>
          <Button
            label="Export backup"
            testID={TestIds.backup.export}
            accessibilityLabel="Export backup"
            loading={exporting}
            disabled={exporting || sharing || importing}
            onPress={handleExport}
          />
          <Button
            label="Share…"
            variant="ghost"
            testID={TestIds.backup.share}
            accessibilityLabel="Share backup"
            loading={sharing}
            disabled={exporting || sharing || importing}
            onPress={handleShare}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text
          maxFontSizeMultiplier={fontScaleCaps.default}
          style={[styles.title, { color: colors.textPrimary }]}
        >
          Import
        </Text>
        <Text
          maxFontSizeMultiplier={fontScaleCaps.default}
          style={[styles.body, { color: colors.textSecondary }]}
        >
          {IMPORT_COPY}
        </Text>
        <View style={styles.actionRow}>
          <Button
            label="Import"
            testID={TestIds.backup.import}
            accessibilityLabel="Import backup"
            loading={importing}
            disabled={exporting || importing}
            onPress={() => setConfirmOpen(true)}
          />
        </View>
        {resultMessage !== null && (
          <Text
            testID={TestIds.backup.result}
            maxFontSizeMultiplier={fontScaleCaps.default}
            style={[styles.resultText, { color: colors.textPrimary }]}
          >
            {resultMessage}
          </Text>
        )}
      </View>

      <View testID={TestIds.backup.confirmImport}>
        <ConfirmDialog
          visible={confirmOpen}
          title="Import backup"
          message="This replaces all profile, resumes, boards, answers and applications on this device with the backup file."
          confirmLabel="Replace and import"
          destructive
          onConfirm={handleConfirmImport}
          onCancel={() => setConfirmOpen(false)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.headline,
  },
  body: {
    ...typography.body,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  resultText: {
    ...typography.bodyStrong,
    marginTop: spacing.xs,
  },
});
