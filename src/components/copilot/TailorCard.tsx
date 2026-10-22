import { Wand2 } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import type { TailorState } from '../../features/workspace/workspaceReducer';
import { AI_ERROR_MESSAGES } from '../../services/ai/types';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, radii, spacing, typography } from '../../theme/tokens';
import { Button } from '../ui/Button';

export interface TailorCardProps {
  tailor: TailorState;
  onTailor: () => void;
  onCopy: (text: string) => void;
}

/**
 * "Improve my application" section. UI_DIRECTIVES.md §4.4 "Tailor card".
 * idle → secondary Button "Improve my application" (Wand2 icon, TestIds.copilot.tailorButton) +
 *   caption "Suggestions, cover note and DM. Uses one more AI request."
 * loading → inline spinner + "Writing suggestions…" (tailorLoading).
 * error → message from AI_ERROR_MESSAGES + "Try again" (tailorError).
 * ready (tailorCard) → "Emphasize" bullet list (emphasize); bullet rewrites (bulletRewrite(i)):
 *   original (caption, textSecondary, strikethrough none) → suggested (body) + reason (caption);
 *   "Cover note" text (coverNote, selectable) + Copy (copyCoverNote); "Cold DM" text (coldDm) + Copy (copyDm).
 *   Empty coverNote/coldDm blocks are hidden.
 */
export function TailorCard({ tailor, onTailor, onCopy }: TailorCardProps) {
  const { colors } = useTheme();

  if (tailor.status === 'idle') {
    return (
      <View style={styles.idle}>
        <Button
          label="Improve my application"
          variant="secondary"
          icon={Wand2}
          testID={TestIds.copilot.tailorButton}
          onPress={onTailor}
          accessibilityLabel="Improve my application"
        />
        <Text
          style={[styles.caption, { color: colors.textSecondary }]}
          maxFontSizeMultiplier={fontScaleCaps.default}
        >
          Suggestions, cover note and DM. Uses one more AI request.
        </Text>
      </View>
    );
  }

  if (tailor.status === 'loading') {
    return (
      <View testID={TestIds.copilot.tailorLoading} style={styles.loadingRow}>
        <ActivityIndicator color={colors.primary} size="small" />
        <Text
          style={[styles.body, { color: colors.textSecondary }]}
          maxFontSizeMultiplier={fontScaleCaps.default}
        >
          Writing suggestions…
        </Text>
      </View>
    );
  }

  if (tailor.status === 'error') {
    return (
      <View testID={TestIds.copilot.tailorError} style={styles.errorContainer}>
        <Text
          style={[styles.body, { color: colors.dangerText }]}
          maxFontSizeMultiplier={fontScaleCaps.default}
        >
          {AI_ERROR_MESSAGES[tailor.code]}
        </Text>
        <Button label="Try again" variant="secondary" onPress={onTailor} />
      </View>
    );
  }

  const { result } = tailor;
  const hasCoverNote = typeof result.coverNote === 'string' && result.coverNote.trim() !== '';
  const hasColdDm = typeof result.coldDm === 'string' && result.coldDm.trim() !== '';

  return (
    <View testID={TestIds.copilot.tailorCard} style={styles.readyContainer}>
      {result.emphasize.length > 0 && (
        <View style={styles.section}>
          <Text
            style={[styles.heading, { color: colors.textPrimary }]}
            maxFontSizeMultiplier={fontScaleCaps.default}
          >
            Emphasize
          </Text>
          <View testID={TestIds.copilot.emphasize} style={styles.bulletList}>
            {result.emphasize.map((point, index) => (
              <Text
                key={index}
                style={[styles.body, { color: colors.textPrimary }]}
                maxFontSizeMultiplier={fontScaleCaps.default}
              >
                {`• ${point}`}
              </Text>
            ))}
          </View>
        </View>
      )}

      {result.bulletRewrites.length > 0 && (
        <View style={styles.section}>
          {result.bulletRewrites.map((rewrite, index) => (
            <View
              key={index}
              testID={TestIds.copilot.bulletRewrite(index)}
              style={[styles.rewriteCard, { borderColor: colors.border }]}
            >
              <Text
                style={[styles.caption, { color: colors.textSecondary }]}
                maxFontSizeMultiplier={fontScaleCaps.default}
              >
                {rewrite.original}
              </Text>
              <Text
                style={[styles.body, { color: colors.textPrimary }]}
                maxFontSizeMultiplier={fontScaleCaps.default}
              >
                {rewrite.suggested}
              </Text>
              <Text
                style={[styles.caption, { color: colors.textSecondary }]}
                maxFontSizeMultiplier={fontScaleCaps.default}
              >
                {rewrite.reason}
              </Text>
            </View>
          ))}
        </View>
      )}

      {hasCoverNote && (
        <View style={styles.section}>
          <View style={styles.blockHeader}>
            <Text
              style={[styles.heading, { color: colors.textPrimary }]}
              maxFontSizeMultiplier={fontScaleCaps.default}
            >
              Cover note
            </Text>
            <Button
              label="Copy"
              variant="ghost"
              testID={TestIds.copilot.copyCoverNote}
              onPress={() => onCopy(result.coverNote)}
            />
          </View>
          <Text
            testID={TestIds.copilot.coverNote}
            selectable
            style={[styles.body, { color: colors.textPrimary }]}
            maxFontSizeMultiplier={fontScaleCaps.default}
          >
            {result.coverNote}
          </Text>
        </View>
      )}

      {hasColdDm && (
        <View style={styles.section}>
          <View style={styles.blockHeader}>
            <Text
              style={[styles.heading, { color: colors.textPrimary }]}
              maxFontSizeMultiplier={fontScaleCaps.default}
            >
              Cold DM
            </Text>
            <Button
              label="Copy"
              variant="ghost"
              testID={TestIds.copilot.copyDm}
              onPress={() => onCopy(result.coldDm)}
            />
          </View>
          <Text
            testID={TestIds.copilot.coldDm}
            selectable
            style={[styles.body, { color: colors.textPrimary }]}
            maxFontSizeMultiplier={fontScaleCaps.default}
          >
            {result.coldDm}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  idle: {
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  caption: {
    ...typography.caption,
  },
  body: {
    ...typography.body,
  },
  heading: {
    ...typography.headline,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  errorContainer: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  readyContainer: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  bulletList: {
    gap: spacing.xs,
  },
  rewriteCard: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
