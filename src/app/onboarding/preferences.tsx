import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PreferencesForm } from '../../components/forms/PreferencesForm';
import { Button } from '../../components/ui/Button';
import { useSnackbar } from '../../components/ui/Snackbar';
import { TestIds } from '../../constants/testIds';
import { useOnboardingStatus } from '../../features/onboarding/useOnboardingStatus';
import { useProfileData } from '../../features/settings/useProfileData';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, spacing, typography } from '../../theme/tokens';
import type { JobPreferences } from '../../types/domain';

/**
 * Step 3 of 3 ("/onboarding/preferences"). UI_DIRECTIVES.md §4.2.
 * Title "What are you looking for?" PreferencesForm. Primary "Finish" (TestIds.onboarding.finish):
 * savePreferences → markCompleted() (the guard switches to the tabs; Workspace opens).
 */
export default function OnboardingPreferencesScreen() {
  const { colors } = useTheme();
  const data = useProfileData();
  const { markCompleted } = useOnboardingStatus();
  const snackbar = useSnackbar();
  const [draft, setDraft] = useState<JobPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const preferences = draft ?? data.preferences;

  async function onFinish() {
    if (saving || data.status === 'loading') return;
    setSaving(true);
    const saved = await data.savePreferences(preferences);
    if (!saved) {
      setSaving(false);
      snackbar.show('Could not save. Try again.');
      return;
    }
    await markCompleted();
    setSaving(false);
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.screen, { backgroundColor: colors.background }]}
      testID={TestIds.onboarding.preferencesScreen}
    >
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text
            testID={TestIds.onboarding.stepIndicator}
            maxFontSizeMultiplier={fontScaleCaps.default}
            style={[styles.step, { color: colors.textSecondary }]}
          >
            Step 3 of 3
          </Text>
          <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
            <View style={[styles.progress, { backgroundColor: colors.primary }]} />
          </View>
          <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.title, { color: colors.textPrimary }]}>
            What are you looking for?
          </Text>
          {data.status === 'loading' ? (
            <ActivityIndicator color={colors.primary} accessibilityLabel="Loading" />
          ) : (
            <PreferencesForm value={preferences} onChange={setDraft} />
          )}
        </ScrollView>
        <View style={styles.bar}>
          <Button
            label="Finish"
            testID={TestIds.onboarding.finish}
            accessibilityLabel="Finish"
            loading={saving}
            disabled={data.status === 'loading' || saving}
            onPress={() => {
              void onFinish();
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  step: {
    ...typography.caption,
  },
  track: {
    height: spacing.xxs,
    borderRadius: spacing.xxs,
    overflow: 'hidden',
  },
  progress: {
    height: spacing.xxs,
    width: '100%',
  },
  title: {
    ...typography.title,
  },
  bar: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
