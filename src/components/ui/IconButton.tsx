import type { LucideIcon } from 'lucide-react-native';
import { Pressable } from 'react-native';

export interface IconButtonProps {
  icon: LucideIcon;
  /** Required: icon-only controls must have an accessible name. */
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

/**
 * Icon-only button. UI_DIRECTIVES.md §3 "IconButton".
 * - Visual icon iconSizes.lg (24), color colors.textPrimary; disabled colors.textDisabled.
 * - Hit area exactly 48x48 on Android, 44x44 on iOS (use the box size, not hitSlop).
 * - Pressed: circular bg colors.surfaceMuted (Android ripple borderless, radius 24).
 * - accessibilityRole "button", accessibilityState {disabled}.
 */
export function IconButton(props: IconButtonProps) {
  // TODO(T-002): implement per the rules above.
  const Icon = props.icon;
  return (
    <Pressable
      testID={props.testID}
      onPress={props.disabled ? undefined : props.onPress}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      accessibilityState={{ disabled: !!props.disabled }}
      style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon size={24} />
    </Pressable>
  );
}
