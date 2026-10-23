import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Trash2, X } from 'lucide-react-native';
import { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { IconButton } from '../../components/ui/IconButton';
import { ListRow } from '../../components/ui/ListRow';
import { useSnackbar } from '../../components/ui/Snackbar';
import { StateView } from '../../components/ui/StateView';
import { TextField } from '../../components/ui/TextField';
import { TestIds } from '../../constants/testIds';
import { deleteResume, insertResume, listResumes } from '../../db/repositories/resumesRepo';
import { useResumeImport } from '../../features/onboarding/useResumeImport';
import { useAiSettings } from '../../features/settings/useAiSettings';
import { deleteResumePdf } from '../../services/resumeFiles';
import { useTheme } from '../../theme/ThemeProvider';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { fontScaleCaps, radii, spacing, typography } from '../../theme/tokens';
import type { Resume } from '../../types/domain';

/**
 * Settings → Resumes. List of resumes (TestIds.resumes.row(id)): label, file name or "Text only", skills
 * count; tap → /settings/resume/[id]; trailing IconButton Trash2 (resumes.delete(id)) → ConfirmDialog
 * "Delete <label>?" → deleteResume + deleteResumePdf. "Add resume" (resumes.add) opens the same import
 * options as onboarding step 2 (useResumeImport) in a bottom panel; new resumes do NOT overwrite the profile
 * (merge only fills empty profile fields). Empty → "No resumes yet".
 */
export default function ResumesSettingsScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const snackbar = useSnackbar();
  const ai = useAiSettings();
  const importer = useResumeImport();
  const insets = useContext(SafeAreaInsetsContext);
  const bottom = (insets?.bottom ?? 0) + spacing.md;

  const [loading, setLoading] = useState(true);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [targetResume, setTargetResume] = useState<Resume | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('Resume');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const reload = useCallback(async () => {
    try {
      const list = await listResumes(db);
      setResumes(list);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  useEffect(() => {
    if (importer.state.status === 'done') {
      void (async () => {
        importer.reset();
        setPanelOpen(false);
        setPasteOpen(false);
        setPasteText('');
        snackbar.show('Resume saved');
        await reload();
      })();
    }
  }, [importer, reload, snackbar]);

  const busy = importer.state.status === 'parsing' || importer.state.status === 'picking';
  const aiReady = ai.status === 'ready' && ai.hasSaved;

  async function handleDelete() {
    if (!targetResume) return;
    const resumeToDelete = targetResume;
    setTargetResume(null);
    await deleteResume(db, resumeToDelete.id);
    if (resumeToDelete.fileUri) {
      await deleteResumePdf(resumeToDelete.fileUri);
    }
    snackbar.show('Resume deleted');
    await reload();
  }

  async function handleManualAdd() {
    const trimmed = newLabel.trim() || 'Resume';
    const inserted = await insertResume(db, {
      label: trimmed,
      fileName: null,
      fileUri: null,
      content: { summary: '', skills: [], highlights: [] },
    });
    if (inserted.ok) {
      setPanelOpen(false);
      snackbar.show('Resume saved');
      await reload();
      router.push(`/settings/resume/${inserted.value.id}`);
    } else {
      snackbar.show(
        inserted.error === 'DUPLICATE_LABEL'
          ? 'A resume with this name exists'
          : 'Could not save. Try again.',
      );
    }
  }

  if (loading) {
    return <StateView kind="loading" message="Loading resumes…" />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID={TestIds.resumes.screen}>
      {resumes.length === 0 ? (
        <StateView
          kind="empty"
          title="No resumes yet"
          message="Add a resume to get job matches and suggestions."
          actionLabel="Add resume"
          actionTestID={TestIds.resumes.add}
          onAction={() => {
            setNewLabel(`Resume ${resumes.length + 1}`);
            setPanelOpen(true);
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {resumes.map((resume) => {
            const skillsCount = resume.content.skills.length;
            const subtitle = `${resume.fileName ?? 'Text only'} · ${skillsCount} ${skillsCount === 1 ? 'skill' : 'skills'}`;
            return (
              <ListRow
                key={resume.id}
                title={resume.label}
                subtitle={subtitle}
                testID={TestIds.resumes.row(resume.id)}
                onPress={() => router.push(`/settings/resume/${resume.id}`)}
                trailing={
                  <IconButton
                    icon={Trash2}
                    testID={TestIds.resumes.delete(resume.id)}
                    accessibilityLabel={`Delete ${resume.label}`}
                    onPress={() => setTargetResume(resume)}
                  />
                }
              />
            );
          })}
          <View style={styles.addSection}>
            <Button
              label="Add resume"
              testID={TestIds.resumes.add}
              onPress={() => {
                setNewLabel(`Resume ${resumes.length + 1}`);
                setPanelOpen(true);
              }}
            />
          </View>
        </ScrollView>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        visible={targetResume !== null}
        title={`Delete ${targetResume?.label ?? ''}?`}
        message="This removes the resume and its file from this device."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setTargetResume(null)}
      />

      {/* Import / Add Bottom Panel */}
      <Modal
        visible={panelOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setPanelOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}
        >
          <View accessibilityViewIsModal aria-modal={true} style={[styles.panel, { backgroundColor: colors.surface, paddingBottom: Math.max(spacing.xl, bottom) }]}>
            <View style={styles.panelHeader}>
              <Text
                style={[styles.panelTitle, { color: colors.textPrimary }]}
                maxFontSizeMultiplier={fontScaleCaps.default}
              >
                Add resume
              </Text>
              <IconButton
                icon={X}
                accessibilityLabel="Close"
                disabled={busy}
                onPress={() => setPanelOpen(false)}
              />
            </View>

            <ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
              <TextField
                label="Resume label"
                value={newLabel}
                onChangeText={setNewLabel}
                testID={TestIds.resumeImport.label}
                autoCapitalize="words"
              />

              {importer.pdfSupported ? (
                <Button
                  label="Import PDF"
                  testID={TestIds.resumeImport.importPdf}
                  accessibilityLabel="Import PDF"
                  disabled={busy}
                  onPress={() => void importer.importPdf(newLabel)}
                />
              ) : (
                <Text
                  style={[styles.caption, { color: colors.textSecondary }]}
                  maxFontSizeMultiplier={fontScaleCaps.default}
                >
                  PDF import needs Gemini
                </Text>
              )}

              {aiReady ? (
                <Button
                  label="Paste resume text"
                  variant="secondary"
                  testID={TestIds.resumeImport.pasteToggle}
                  accessibilityLabel="Paste resume text"
                  disabled={busy}
                  onPress={() => setPasteOpen((prev) => !prev)}
                />
              ) : null}

              {pasteOpen && aiReady ? (
                <View style={styles.pasteBlock}>
                  <TextField
                    label="Resume text"
                    value={pasteText}
                    onChangeText={setPasteText}
                    testID={TestIds.resumeImport.pasteText}
                    multiline
                    numberOfLines={6}
                  />
                  <Button
                    label="Read my resume"
                    testID={TestIds.resumeImport.pasteSubmit}
                    accessibilityLabel="Read my resume"
                    disabled={busy || pasteText.trim() === ''}
                    onPress={() => void importer.importText(newLabel, pasteText)}
                  />
                </View>
              ) : null}

              <Button
                label="Fill in manually"
                variant="ghost"
                testID={TestIds.resumeImport.manual}
                accessibilityLabel="Fill in manually"
                disabled={busy}
                onPress={() => void handleManualAdd()}
              />

              {importer.state.status === 'parsing' || importer.state.status === 'picking' ? (
                <View testID={TestIds.resumeImport.status} style={styles.statusBlock}>
                  <ActivityIndicator color={colors.primary} accessibilityLabel="Reading your resume" />
                  <Text
                    style={[styles.statusText, { color: colors.textPrimary }]}
                    maxFontSizeMultiplier={fontScaleCaps.default}
                  >
                    Reading your resume…
                  </Text>
                </View>
              ) : null}

              {importer.state.status === 'error' ? (
                <View testID={TestIds.resumeImport.status} style={styles.statusBlock}>
                  <Text
                    style={[styles.statusText, { color: colors.dangerText }]}
                    maxFontSizeMultiplier={fontScaleCaps.default}
                  >
                    {importer.state.message}
                  </Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={importer.reset}>
                    <Text
                      style={[styles.link, { color: colors.primary }]}
                      maxFontSizeMultiplier={fontScaleCaps.default}
                    >
                      Try again
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  addSection: {
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panel: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: '85%',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  panelTitle: {
    ...typography.headline,
  },
  panelContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  caption: {
    ...typography.caption,
  },
  pasteBlock: {
    gap: spacing.sm,
  },
  statusBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusText: {
    ...typography.body,
  },
  link: {
    ...typography.bodyStrong,
    textDecorationLine: 'underline',
  },
});
