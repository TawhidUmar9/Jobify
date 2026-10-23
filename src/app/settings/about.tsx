import Constants from 'expo-constants';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListRow } from '../../components/ui/ListRow';
import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, radii, spacing, typography } from '../../theme/tokens';

export const PRIVACY_STATEMENT =
  "Jobify has no servers and no account. Your profile, resumes, answers and applications are stored only on this device. When you tap Analyze, Improve, or import a resume, the page text and the relevant profile details are sent to the AI provider you configured, under that provider's terms. Your API key is kept in the system keystore and is never included in backups.";

/**
 * Settings → About. App name + version (expo-constants expoConfig.version); one-paragraph privacy statement
 * (UI_DIRECTIVES §6 "Privacy statement"); "Source code" link (about.sourceLink) → the repository URL in
 * app.json expo.extra.repositoryUrl via Linking; license name; "Open-source licenses" (about.licenses) →
 * opens the LICENSES.md URL in the repo. No analytics, no update checks.
 */
export default function AboutScreen() {
  const { colors } = useTheme();

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const extra = Constants.expoConfig?.extra as { repositoryUrl?: string } | undefined;
  const repoUrl = extra?.repositoryUrl ?? 'https://github.com/TawhidUmar9/jobify';
  const licensesUrl = `${repoUrl.replace(/\/$/, '')}/blob/main/LICENSES.md`;

  return (
    <ScrollView
      testID={TestIds.about.screen}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.headerCard, { backgroundColor: colors.surface }]}>
        <Text
          maxFontSizeMultiplier={fontScaleCaps.default}
          style={[styles.appName, { color: colors.textPrimary }]}
        >
          Jobify
        </Text>
        <Text
          maxFontSizeMultiplier={fontScaleCaps.default}
          style={[styles.version, { color: colors.textSecondary }]}
        >
          Version {version}
        </Text>
        <Text
          maxFontSizeMultiplier={fontScaleCaps.default}
          style={[styles.license, { color: colors.textSecondary }]}
        >
          License: GPL-3.0-or-later
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text
          maxFontSizeMultiplier={fontScaleCaps.default}
          style={[styles.sectionTitle, { color: colors.textPrimary }]}
        >
          Privacy
        </Text>
        <Text
          maxFontSizeMultiplier={fontScaleCaps.default}
          style={[styles.body, { color: colors.textSecondary }]}
        >
          {PRIVACY_STATEMENT}
        </Text>
      </View>

      <View style={[styles.cardNoPadding, { backgroundColor: colors.surface }]}>
        <ListRow
          title="Source code"
          testID={TestIds.about.sourceLink}
          onPress={() => Linking.openURL(repoUrl).catch(() => {})}
        />
        <ListRow
          title="Open-source licenses"
          testID={TestIds.about.licenses}
          onPress={() => Linking.openURL(licensesUrl).catch(() => {})}
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
  headerCard: {
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  appName: {
    ...typography.title,
  },
  version: {
    ...typography.body,
  },
  license: {
    ...typography.caption,
    marginTop: spacing.xxs,
  },
  card: {
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardNoPadding: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  sectionTitle: {
    ...typography.headline,
  },
  body: {
    ...typography.body,
    lineHeight: 22,
  },
});
