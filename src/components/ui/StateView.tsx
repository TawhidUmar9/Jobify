import { useEffect } from 'react';
import { AccessibilityInfo, ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, spacing, typography } from '../../theme/tokens';
import { Button } from './Button';

export type StateViewProps =
  | { kind: 'loading'; message: string; testID?: string }
  | {
      kind: 'empty' | 'error';
      title: string;
      message: string;
      actionLabel?: string;
      onAction?: () => void;
      testID?: string;
      actionTestID?: string;
    };

/** Doc comment specifies this cap; it is not a spacing token. */
const CONTENT_MAX_WIDTH = 320;

/**
 * Full-area placeholder for loading, empty, and error states. UI_DIRECTIVES.md §3 "StateView".
 * - Centered column, max width 320, padding spacing.xl.
 * - loading: ActivityIndicator (colors.primary, size "large") + message (typography.body,
 *   colors.textSecondary). accessibilityLiveRegion "polite" / accessibilityRole "progressbar".
 * - empty: title (typography.headline) + message (typography.body, textSecondary) + optional
 *   secondary Button.
 * - error: same as empty but message is announced: AccessibilityInfo.announceForAccessibility
 *   on mount; optional primary Button for retry.
 * - No illustrations, no emoji.
 */
export function StateView(props: StateViewProps) {
  const { colors } = useTheme();
  const announce = props.kind === 'error' ? props.message : null;

  useEffect(() => {
    if (announce) AccessibilityInfo.announceForAccessibility(announce);
  }, [announce]);

  if (props.kind === 'loading') {
    return (
      <View
        testID={props.testID}
        accessibilityRole="progressbar"
        accessibilityLiveRegion="polite"
        style={styles.wrap}
      >
        <View style={styles.column}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.message, { color: colors.textSecondary }]}>{props.message}</Text>
        </View>
      </View>
    );
  }

  const showAction = !!props.actionLabel && !!props.onAction;

  return (
    <View testID={props.testID} style={styles.wrap}>
      <View style={styles.column}>
        <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.title, { color: colors.textPrimary }]}>{props.title}</Text>
        <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.message, { color: colors.textSecondary }]}>{props.message}</Text>
        {showAction ? (
          <Button
            label={props.actionLabel ?? ''}
            onPress={props.onAction ?? (() => {})}
            variant={props.kind === 'error' ? 'primary' : 'secondary'}
            testID={props.actionTestID}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  column: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.headline,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
});
