import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, iconSizes, iconStrokeWidth, radii, spacing, touchTarget, typography } from '../../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Optional leading icon (lucide), size iconSizes.md, stroke iconStrokeWidth. Decorative. */
  icon?: LucideIcon;
  disabled?: boolean;
  /** Shows an ActivityIndicator in place of the icon and blocks presses. */
  loading?: boolean;
  testID?: string;
  /** Defaults to `label`. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const minHeight = Platform.select({
  ios: touchTarget.ios,
  android: touchTarget.android,
  default: touchTarget.android,
});

/**
 * Text button. UI_DIRECTIVES.md §3 "Button".
 * - minHeight 48 (Android) / 44 (iOS); horizontal padding spacing.md; radius radii.md.
 * - primary: bg colors.primary, text colors.onPrimary; pressed bg colors.primaryPressed.
 * - secondary: bg colors.surface, 1px colors.borderStrong, text colors.primary.
 * - ghost: transparent, text colors.primary.
 * - disabled: opacity 0.4, accessibilityState {disabled: true}, onPress not called.
 * - loading: accessibilityState {busy: true}, onPress not called.
 * - Android: android_ripple; iOS: opacity 0.7 while pressed. No layout shift on press.
 * - Text: typography.bodyStrong, numberOfLines 2, maxFontSizeMultiplier fontScaleCaps.default.
 * - accessibilityRole "button".
 */
export function Button(props: ButtonProps) {
  const { colors } = useTheme();
  const variant = props.variant ?? 'primary';
  const blocked = !!props.disabled || !!props.loading;
  const Icon = props.icon;
  const textColor = variant === 'primary' ? colors.onPrimary : colors.primary;

  return (
    <Pressable
      testID={props.testID}
      disabled={!!props.disabled}
      onPress={() => {
        if (blocked) return;
        props.onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? props.label}
      accessibilityHint={props.accessibilityHint}
      accessibilityState={{ disabled: !!props.disabled, busy: !!props.loading }}
      android_ripple={
        blocked || Platform.OS !== 'android'
          ? undefined
          : { color: variant === 'primary' ? colors.primaryPressed : colors.borderStrong }
      }
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && {
          backgroundColor: pressed ? colors.primaryPressed : colors.primary,
        },
        variant === 'secondary' && {
          backgroundColor: colors.surface,
          borderColor: colors.borderStrong,
        },
        variant === 'ghost' && styles.ghost,
        props.disabled ? styles.disabled : null,
        pressed && Platform.OS === 'ios' && !blocked ? styles.pressedIos : null,
      ]}
    >
      {props.loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : Icon ? (
        <Icon
          size={iconSizes.md}
          strokeWidth={iconStrokeWidth}
          color={textColor}
          accessible={false}
          importantForAccessibility="no"
        />
      ) : null}
      <Text
        numberOfLines={2}
        maxFontSizeMultiplier={fontScaleCaps.default}
        style={[styles.label, { color: textColor }]}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.4,
  },
  pressedIos: {
    opacity: 0.7,
  },
  label: {
    ...typography.bodyStrong,
    textAlign: 'center',
  },
});
