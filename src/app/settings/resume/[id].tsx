import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ResumeContentForm } from '../../../components/forms/ResumeContentForm';
import { Button } from '../../../components/ui/Button';
import { useSnackbar } from '../../../components/ui/Snackbar';
import { StateView } from '../../../components/ui/StateView';
import { TestIds } from '../../../constants/testIds';
import { getResume, updateResume } from '../../../db/repositories/resumesRepo';
import { useTheme } from '../../../theme/ThemeProvider';
import { spacing } from '../../../theme/tokens';
import type { Resume, ResumeContent } from '../../../types/domain';

/**
 * Settings → Edit resume ([id] param). ResumeContentForm; "Save" (TestIds.resumes.editSave) →
 * updateResume → back. DUPLICATE_LABEL → "A resume with this name exists". not found → StateView.
 */
export default function ResumeEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const resumeId = typeof id === 'string' ? parseInt(id, 10) : NaN;
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const snackbar = useSnackbar();

  const [status, setStatus] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading');
  const [, setResume] = useState<Resume | null>(null);
  const [label, setLabel] = useState('');
  const [content, setContent] = useState<ResumeContent>({ summary: '', skills: [], highlights: [] });
  const [labelError, setLabelError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (isNaN(resumeId) || resumeId <= 0) {
        if (!cancelled) setStatus('not_found');
        return;
      }
      try {
        const row = await getResume(db, resumeId);
        if (cancelled) return;
        if (!row) {
          setStatus('not_found');
          return;
        }
        setResume(row);
        setLabel(row.label);
        setContent(row.content);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, resumeId]);

  if (status === 'loading') {
    return <StateView kind="loading" message="Loading resume…" />;
  }

  if (status === 'not_found') {
    return (
      <StateView
        kind="empty"
        title="Resume not found"
        message="This resume does not exist."
        actionLabel="Back to Resumes"
        onAction={() => router.back()}
      />
    );
  }

  if (status === 'error') {
    return (
      <StateView
        kind="error"
        title="Could not load resume"
        message="Please try again."
        actionLabel="Back"
        onAction={() => router.back()}
      />
    );
  }

  async function handleSave() {
    setSaving(true);
    setLabelError(null);
    const result = await updateResume(db, resumeId, { label, content });
    setSaving(false);
    if (!result.ok) {
      if (result.error === 'DUPLICATE_LABEL') {
        setLabelError('A resume with this name exists');
        return;
      }
      if (result.error === 'EMPTY_LABEL') {
        setLabelError('Enter a resume name');
        return;
      }
      snackbar.show('Could not save. Try again.');
      return;
    }
    snackbar.show('Resume saved');
    router.back();
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <ResumeContentForm
        label={label}
        onLabelChange={(val) => {
          setLabel(val);
          setLabelError(null);
        }}
        value={content}
        onChange={setContent}
        labelError={labelError}
      />
      <View style={styles.actions}>
        <Button
          label="Save"
          testID={TestIds.resumes.editSave}
          loading={saving}
          onPress={handleSave}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  actions: {
    marginTop: spacing.md,
  },
});
