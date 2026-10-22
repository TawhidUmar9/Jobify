import { router, useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, View } from 'react-native';

import { ProfileForm, validateProfile } from '../../components/forms/ProfileForm';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useSnackbar } from '../../components/ui/Snackbar';
import { StateView } from '../../components/ui/StateView';
import { TestIds } from '../../constants/testIds';
import { useProfileData } from '../../features/settings/useProfileData';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import type { CandidateProfile } from '../../types/domain';

/**
 * Settings → Profile. ProfileForm bound to useProfileData(). "Save" (TestIds.profileForm.save):
 * validateProfile → saveProfile → snackbar "Profile saved". Unsaved changes + back → ConfirmDialog
 * "Discard changes?".
 */
export default function ProfileSettingsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const data = useProfileData();
  const snackbar = useSnackbar();

  const [draft, setDraft] = useState<CandidateProfile | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof CandidateProfile, string>>>({});
  const [saving, setSaving] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const isSavedRef = useRef(false);

  const currentProfile = draft ?? data.profile;
  const hasUnsavedChanges = draft !== null && JSON.stringify(draft) !== JSON.stringify(data.profile);

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
    return <StateView kind="loading" message="Loading profile…" />;
  }

  if (data.status === 'error') {
    return <StateView kind="error" title="Could not load profile" message="Please try again." />;
  }

  async function handleSave() {
    const fieldErrors = validateProfile(currentProfile);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setSaving(true);
    const ok = await data.saveProfile(currentProfile);
    setSaving(false);
    if (ok) {
      isSavedRef.current = true;
      snackbar.show('Profile saved');
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
      <ProfileForm value={currentProfile} onChange={setDraft} errors={errors} />
      <View style={styles.actions}>
        <Button
          label="Save"
          testID={TestIds.profileForm.save}
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
