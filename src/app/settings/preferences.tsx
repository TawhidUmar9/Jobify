import { router, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';

import { PreferencesForm } from '../../components/forms/PreferencesForm';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useSnackbar } from '../../components/ui/Snackbar';
import { StateView } from '../../components/ui/StateView';
import { TestIds } from '../../constants/testIds';
import { useProfileData } from '../../features/settings/useProfileData';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import type { JobPreferences } from '../../types/domain';

/**
 * Settings → Job preferences. PreferencesForm bound to useProfileData(). "Save" (TestIds.preferencesForm.save)
 * → snackbar "Preferences saved".
 */
export default function PreferencesSettingsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const data = useProfileData();
  const snackbar = useSnackbar();

  const [draft, setDraft] = useState<JobPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const isSavedRef = useRef(false);

  const currentPreferences = draft ?? data.preferences;
  const hasUnsavedChanges = draft !== null && JSON.stringify(draft) !== JSON.stringify(data.preferences);

  useEffect(() => {
    const nav = navigation as unknown as { addListener?: (event: string, cb: (e: { preventDefault: () => void; data: { action: unknown } }) => void) => () => void; dispatch?: (action: unknown) => void };
    if (!nav?.addListener) return;
    const unsubscribe = nav.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges || isSavedRef.current) return;
      e.preventDefault();
      setPendingAction(() => () => nav.dispatch?.(e.data.action));
      setShowDiscard(true);
    });
    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasUnsavedChanges && !isSavedRef.current) {
        setShowDiscard(true);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [hasUnsavedChanges]);

  if (data.status === 'loading') {
    return <StateView kind="loading" message="Loading preferences…" />;
  }

  if (data.status === 'error') {
    return <StateView kind="error" title="Could not load preferences" message="Please try again." />;
  }

  async function handleSave() {
    setSaving(true);
    const ok = await data.savePreferences(currentPreferences);
    setSaving(false);
    if (ok) {
      isSavedRef.current = true;
      snackbar.show('Preferences saved');
      router.back();
    } else {
      snackbar.show('Could not save. Try again.');
    }
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <PreferencesForm value={currentPreferences} onChange={setDraft} />
      <View style={styles.actions}>
        <Button
          label="Save"
          testID={TestIds.preferencesForm.save}
          loading={saving}
          onPress={handleSave}
        />
      </View>
      <ConfirmDialog
        visible={showDiscard}
        title="Discard changes?"
        message="You have unsaved changes. Are you sure you want to discard them?"
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setShowDiscard(false);
          if (pendingAction) {
            pendingAction();
          } else {
            router.back();
          }
        }}
        onCancel={() => {
          setShowDiscard(false);
          setPendingAction(null);
        }}
      />
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
