import { router, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';

import { AiSettingsForm } from '../../components/forms/AiSettingsForm';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useSnackbar } from '../../components/ui/Snackbar';
import { StateView } from '../../components/ui/StateView';
import { TestIds } from '../../constants/testIds';
import { useAiSettings } from '../../features/settings/useAiSettings';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';

/**
 * Settings → AI provider. UI_DIRECTIVES.md §4.3. AiSettingsForm bound to useAiSettings().
 * Primary "Save" (TestIds.aiForm.save) → save() → snackbar "AI settings saved" + router.back().
 * When hasSaved: destructive ghost "Remove key and settings" (TestIds.aiForm.remove) → ConfirmDialog → remove().
 * Unsaved changes + back → ConfirmDialog "Discard changes?".
 */
export default function AiSettingsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const ai = useAiSettings();
  const snackbar = useSnackbar();
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const isSavedRef = useRef(false);

  const hasUnsavedChanges = ai.dirty;

  useEffect(() => {
    const nav = navigation as unknown as {
      addListener?: (
        event: string,
        cb: (e: { preventDefault: () => void; data: { action: unknown } }) => void,
      ) => () => void;
      dispatch?: (action: unknown) => void;
    };
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

  if (ai.status === 'loading') {
    return <StateView kind="loading" message="Loading AI settings…" />;
  }

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <AiSettingsForm
        draft={ai.draft}
        onChange={ai.setDraft}
        onTest={ai.test}
        testState={ai.testState}
      />
      <View style={styles.actions}>
        <Button
          label="Save"
          testID={TestIds.aiForm.save}
          loading={saving}
          disabled={saving || ai.testState.status === 'testing'}
          onPress={async () => {
            setSaving(true);
            const ok = await ai.save();
            setSaving(false);
            if (ok) {
              isSavedRef.current = true;
              snackbar.show('AI settings saved');
              router.back();
            } else {
              snackbar.show('Could not save. Try again.');
            }
          }}
        />
        {ai.hasSaved ? (
          <Button
            label="Remove key and settings"
            variant="ghost"
            testID={TestIds.aiForm.remove}
            onPress={() => setConfirmOpen(true)}
          />
        ) : null}
      </View>
      <ConfirmDialog
        visible={confirmOpen}
        title="Remove key and settings?"
        message="This deletes your AI configuration and API key from this device."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          setConfirmOpen(false);
          isSavedRef.current = true;
          await ai.remove();
          router.back();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
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
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
