import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AiSettingsForm } from '../../components/forms/AiSettingsForm';
import { Button } from '../../components/ui/Button';
import { TestIds } from '../../constants/testIds';
import { useAiSettings } from '../../features/settings/useAiSettings';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, spacing, typography } from '../../theme/tokens';

/**
 * Step 1 of 3 ("/onboarding/ai"). UI_DIRECTIVES.md §4.2. ScrollView + KeyboardAvoidingView.
 * Title "Connect an AI provider"; body "Jobify uses your own API key. Gemini has a free tier."
 * AiSettingsForm bound to useAiSettings(). Footer: ghost "Skip for now" (TestIds.onboarding.skip,
 * caption "You can browse and track without AI") → /onboarding/profile without saving;
 * primary "Continue" (next) → save(); ok → router.push('/onboarding/profile'); invalid → field errors.
 * Continue does not require a successful test.
 */
export default function OnboardingAiScreen() {
  const { colors } = useTheme();
  const settings = useAiSettings();
  const [saving, setSaving] = useState(false);

  async function onContinue() {
    if (saving || settings.status === 'loading') return;
    setSaving(true);
    const ok = await settings.save();
    setSaving(false);
    if (ok) router.push('/onboarding/profile');
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.screen, { backgroundColor: colors.background }]}
      testID={TestIds.onboarding.aiScreen}
    >
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text
            testID={TestIds.onboarding.stepIndicator}
            maxFontSizeMultiplier={fontScaleCaps.default}
            style={[styles.step, { color: colors.textSecondary }]}
          >
            Step 1 of 3
          </Text>
          <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
            <View style={[styles.progress, { backgroundColor: colors.primary }]} />
          </View>
          <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.title, { color: colors.textPrimary }]}>
            Connect an AI provider
          </Text>
          <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.body, { color: colors.textSecondary }]}>
            Jobify uses your own API key. Gemini has a free tier.
          </Text>
          {settings.status === 'loading' ? (
            <ActivityIndicator color={colors.primary} accessibilityLabel="Loading" />
          ) : (
            <AiSettingsForm
              draft={settings.draft}
              onChange={settings.setDraft}
              onTest={() => {
                void settings.test();
              }}
              testState={settings.testState}
            />
          )}
        </ScrollView>
        <View style={styles.bar}>
          <View style={styles.skip}>
            <Button
              label="Skip for now"
              variant="ghost"
              testID={TestIds.onboarding.skip}
              accessibilityLabel="Skip for now"
              onPress={() => router.push('/onboarding/profile')}
            />
            <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.caption, { color: colors.textSecondary }]}>
              You can browse and track without AI
            </Text>
          </View>
          <Button
            label="Continue"
            testID={TestIds.onboarding.next}
            accessibilityLabel="Continue"
            loading={saving}
            disabled={settings.status === 'loading' || saving}
            onPress={() => {
              void onContinue();
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
    width: '33.333%',
  },
  title: {
    ...typography.title,
  },
  body: {
    ...typography.body,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  skip: {
    flexShrink: 1,
    gap: spacing.xxs,
  },
  caption: {
    ...typography.caption,
  },
});
