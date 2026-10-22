import { router } from 'expo-router';
import { Globe, ListChecks, Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, iconSizes, iconStrokeWidth, spacing, typography } from '../../theme/tokens';

const BULLETS = [
  { icon: Globe, text: 'Browse job boards with your logins saved' },
  { icon: Sparkles, text: 'Check fit, red flags and fill forms with your own AI key' },
  { icon: ListChecks, text: 'Track every application on this device' },
] as const;

/**
 * Welcome ("/onboarding"). UI_DIRECTIVES.md §4.2.
 * Title "Jobify", subtitle "Your job search, in one place." Three bullets (icons Globe, Sparkles, ListChecks):
 * "Browse job boards with your logins saved", "Check fit, red flags and fill forms with your own AI key",
 * "Track every application on this device". Privacy caption: "No account. No tracking. Your data stays
 * on this phone." Primary "Get started" (TestIds.onboarding.start) → router.push('/onboarding/ai').
 * Ghost "Restore from backup" (restoreBackup) → ConfirmDialog → importBackup; success → markCompleted().
 */
export default function OnboardingWelcomeScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.screen, { backgroundColor: colors.background }]} testID={TestIds.onboarding.welcome}>
      <View style={styles.body}>
        <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.title, { color: colors.textPrimary }]}>
          Jobify
        </Text>
        <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your job search, in one place.
        </Text>
        <View style={styles.bullets}>
          {BULLETS.map((bullet) => {
            const Icon = bullet.icon;
            return (
              <View key={bullet.text} style={styles.bullet}>
                <Icon
                  size={iconSizes.lg}
                  strokeWidth={iconStrokeWidth}
                  color={colors.textPrimary}
                  accessible={false}
                  importantForAccessibility="no"
                />
                <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.bulletText, { color: colors.textPrimary }]}>
                  {bullet.text}
                </Text>
              </View>
            );
          })}
        </View>
        <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.caption, { color: colors.textSecondary }]}>
          No account. No tracking. Your data stays on this phone.
        </Text>
      </View>
      <View style={styles.bar}>
        <View style={styles.restore}>
          <Button
            label="Restore from backup"
            variant="ghost"
            disabled
            testID={TestIds.onboarding.restoreBackup}
            accessibilityLabel="Restore from backup"
            accessibilityHint="Available after setup"
            onPress={() => {}}
          />
          <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.caption, { color: colors.textSecondary }]}>
            Available after setup
          </Text>
        </View>
        <Button
          label="Get started"
          testID={TestIds.onboarding.start}
          accessibilityLabel="Get started"
          onPress={() => router.push('/onboarding/ai')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.body,
  },
  bullets: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bulletText: {
    ...typography.body,
    flex: 1,
  },
  caption: {
    ...typography.caption,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  restore: {
    flexShrink: 1,
    gap: spacing.xxs,
  },
});
