import type { LucideIcon } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { iconSizes, iconStrokeWidth, touchTarget } from '../../theme/tokens';

export interface IconButtonProps {
  icon: LucideIcon;
  /** Required: icon-only controls must have an accessible name. */
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}

const box = Platform.select({
  ios: touchTarget.ios,
  android: touchTarget.android,
  default: touchTarget.android,
});

/**
 * Icon-only button. UI_DIRECTIVES.md §3 "IconButton".
 * - Visual icon iconSizes.lg (24), color colors.textPrimary; disabled colors.textDisabled.
 * - Hit area exactly 48x48 on Android, 44x44 on iOS (use the box size, not hitSlop).
 * - Pressed: circular bg colors.surfaceMuted (Android ripple borderless, radius 24).
 * - accessibilityRole "button", accessibilityState {disabled}.
 */
export function IconButton(props: IconButtonProps) {
  const { colors } = useTheme();
  const Icon = props.icon;
  const blocked = !!props.disabled;

  return (
    <Pressable
      testID={props.testID}
      disabled={blocked}
      onPress={() => {
        if (blocked) return;
        props.onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      accessibilityState={{ disabled: blocked }}
      android_ripple={
        blocked || Platform.OS !== 'android'
          ? undefined
          : { color: colors.surfaceMuted, borderless: true, radius: touchTarget.android / 2 }
      }
      style={({ pressed }) => [
        styles.hit,
        pressed && !blocked ? { backgroundColor: colors.surfaceMuted } : null,
      ]}
    >
      <Icon
        size={iconSizes.lg}
        strokeWidth={iconStrokeWidth}
        color={blocked ? colors.textDisabled : colors.textPrimary}
        accessible={false}
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: box,
    height: box,
    borderRadius: box / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
