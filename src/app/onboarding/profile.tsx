import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileForm, validateProfile } from '../../components/forms/ProfileForm';
import { Button } from '../../components/ui/Button';
import { useSnackbar } from '../../components/ui/Snackbar';
import { TextField } from '../../components/ui/TextField';
import { TestIds } from '../../constants/testIds';
import { useResumeImport } from '../../features/onboarding/useResumeImport';
import { useAiSettings } from '../../features/settings/useAiSettings';
import { useProfileData } from '../../features/settings/useProfileData';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, spacing, typography } from '../../theme/tokens';
import type { CandidateProfile } from '../../types/domain';

/**
 * Step 2 of 3 ("/onboarding/profile"). UI_DIRECTIVES.md §4.2.
 * Title "Add your resume". Resume label TextField (TestIds.resumeImport.label, default "Main").
 * Options: primary "Import PDF" (importPdf; hidden when !pdfSupported or AI skipped, with caption
 * "PDF import needs Gemini"), secondary "Paste resume text" (pasteToggle → multiline pasteText +
 * "Read my resume" pasteSubmit; needs AI), ghost "Fill in manually" (manual).
 * Status line (resumeImport.status): parsing → "Reading your resume…" spinner; error → message.
 * After import or manual: ProfileForm prefilled (useProfileData). Primary "Continue" (next):
 * validateProfile → saveProfile → /onboarding/preferences.
 */
export default function OnboardingProfileScreen() {
  const { colors } = useTheme();
  const data = useProfileData();
  const ai = useAiSettings();
  const importer = useResumeImport();
  const snackbar = useSnackbar();
  const [label, setLabel] = useState('Main');
  const [manual, setManual] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [draft, setDraft] = useState<{ key: string; value: CandidateProfile } | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  const imported = importer.state.status === 'done' ? importer.state : null;
  const draftKey = imported ? `import-${imported.resume.id}` : 'local';
  const profile = draft?.key === draftKey ? draft.value : (imported?.profile ?? data.profile);

  const busy = importer.state.status === 'parsing' || importer.state.status === 'picking';
  const aiReady = ai.status === 'ready' && ai.hasSaved;
  const showForm = manual || importer.state.status === 'done' || showErrors;
  const errors = showErrors ? validateProfile(profile) : {};

  async function onContinue() {
    if (saving || data.status === 'loading') return;
    const nextErrors = validateProfile(profile);
    if (nextErrors.fullName || nextErrors.email || nextErrors.countryCode) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    const ok = await data.saveProfile(profile);
    setSaving(false);
    if (!ok) {
      snackbar.show('Could not save. Try again.');
      return;
    }
    router.push('/onboarding/preferences');
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.screen, { backgroundColor: colors.background }]}
      testID={TestIds.onboarding.profileScreen}
    >
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text
            testID={TestIds.onboarding.stepIndicator}
            maxFontSizeMultiplier={fontScaleCaps.default}
            style={[styles.step, { color: colors.textSecondary }]}
          >
            Step 2 of 3
          </Text>
          <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
            <View style={[styles.progress, { backgroundColor: colors.primary }]} />
          </View>
          <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.title, { color: colors.textPrimary }]}>
            Add your resume
          </Text>
          <TextField label="Resume label" value={label} onChangeText={setLabel} testID={TestIds.resumeImport.label} autoCapitalize="words" />
          {importer.pdfSupported ? (
            <Button
              label="Import PDF"
              testID={TestIds.resumeImport.importPdf}
              accessibilityLabel="Import PDF"
              disabled={busy}
              onPress={() => {
                void importer.importPdf(label);
              }}
            />
          ) : (
            <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.caption, { color: colors.textSecondary }]}>
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
              onPress={() => setPasteOpen(true)}
            />
          ) : null}
          {pasteOpen && aiReady ? (
            <View style={styles.paste}>
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
                onPress={() => {
                  void importer.importText(label, pasteText);
                }}
              />
            </View>
          ) : null}
          <Button
            label="Fill in manually"
            variant="ghost"
            testID={TestIds.resumeImport.manual}
            accessibilityLabel="Fill in manually"
            onPress={() => setManual(true)}
          />
          {importer.state.status === 'parsing' || importer.state.status === 'picking' ? (
            <View testID={TestIds.resumeImport.status} style={styles.status}>
              <ActivityIndicator color={colors.primary} accessibilityLabel="Reading your resume" />
              <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.body, { color: colors.textPrimary }]}>
                Reading your resume…
              </Text>
            </View>
          ) : null}
          {importer.state.status === 'error' ? (
            <View testID={TestIds.resumeImport.status} style={styles.status}>
              <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.body, { color: colors.dangerText }]}>
                {importer.state.message}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={importer.reset}>
                <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.link, { color: colors.primary }]}>
                  Try again
                </Text>
              </Pressable>
            </View>
          ) : null}
          {importer.state.status === 'done' ? (
            <Text
              testID={TestIds.resumeImport.status}
              maxFontSizeMultiplier={fontScaleCaps.default}
              style={[styles.body, { color: colors.successText }]}
            >
              Resume added. Check the details below.
            </Text>
          ) : null}
          {showForm ? (
            <ProfileForm
              value={profile}
              onChange={(value) => setDraft({ key: draftKey, value })}
              errors={errors}
            />
          ) : null}
        </ScrollView>
        <View style={styles.bar}>
          <Button
            label="Continue"
            testID={TestIds.onboarding.next}
            accessibilityLabel="Continue"
            loading={saving}
            disabled={data.status === 'loading' || saving || busy}
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
    width: '66.666%',
  },
  title: {
    ...typography.title,
  },
  caption: {
    ...typography.caption,
  },
  body: {
    ...typography.body,
  },
  paste: {
    gap: spacing.sm,
  },
  status: {
    gap: spacing.xs,
  },
  link: {
    ...typography.bodyStrong,
  },
  bar: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
});
