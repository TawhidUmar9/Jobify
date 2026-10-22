import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

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
  // TODO(T-002): implement per the rules above.
  return (
    <Pressable
      testID={props.testID}
      onPress={props.disabled || props.loading ? undefined : props.onPress}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? props.label}
      accessibilityState={{ disabled: !!props.disabled, busy: !!props.loading }}
      style={{ minHeight: 48, justifyContent: 'center' }}
    >
      <Text>{props.label}</Text>
    </Pressable>
  );
}
