import type { LucideIcon } from 'lucide-react-native';
import { BookmarkCheck, BookmarkPlus, FileDown, Zap } from 'lucide-react-native';
import { useContext } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import {
  fontScaleCaps,
  iconSizes,
  iconStrokeWidth,
  radii,
  spacing,
  touchTarget,
  typography,
} from '../../theme/tokens';

export interface CopilotActionsProps {
  canAutoFill: boolean;
  filling: boolean;
  staging: boolean;
  logged: boolean;
  logging: boolean;
  /** Disables all footer actions when the page is not a job post (D-008). */
  disabled?: boolean;
  onAutoFill: () => void;
  onStageResume: () => void;
  onLogApplication: () => void;
}

/** Below this width the row keeps labels and drops icons. */
const ICON_MIN_WIDTH = 360;

const minHeight = Platform.select({
  ios: touchTarget.ios,
  android: touchTarget.android,
  default: touchTarget.android,
});

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

function ActionButton(props: ActionButtonProps) {
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
      accessibilityState={{ disabled: !!props.disabled, busy: !!props.loading }}
      android_ripple={
        blocked || Platform.OS !== 'android'
          ? undefined
          : { color: variant === 'primary' ? colors.primaryPressed : colors.borderStrong }
      }
      style={({ pressed }) => [
        styles.buttonBase,
        variant === 'primary' && {
          backgroundColor: pressed ? colors.primaryPressed : colors.primary,
        },
        variant === 'secondary' && {
          backgroundColor: colors.surface,
          borderColor: colors.borderStrong,
        },
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
        numberOfLines={1}
        maxFontSizeMultiplier={fontScaleCaps.compact}
        style={[styles.label, { color: textColor }]}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

/**
 * Bottom action row inside the sheet footer. UI_DIRECTIVES.md §4.4 "Copilot actions", T-046e E3.
 * Three buttons, equal width (wrapping onto two rows if needed at 1.5 font scale),
 * gap spacing.xs, padding spacing.md, top hairline colors.border, bottom padding includes safe-area inset:
 * 1. primary  "Auto-fill"   lucide Zap      TestIds.copilot.autoFill        disabled !canAutoFill || disabled, loading filling
 * 2. secondary "Stage CV"   lucide FileDown TestIds.copilot.stageResume     disabled disabled, loading staging
 * 3. secondary "Log" / "Logged" lucide BookmarkPlus / BookmarkCheck  TestIds.copilot.logApplication
 *    disabled when logged or disabled; loading logging.
 * accessibilityLabels: "Auto-fill form fields", "Stage recommended resume and copy cover note",
 * "Log application to Tracker" / "Application already logged".
 * On screens < 360dp wide, labels stay; icons are dropped.
 * Labels get numberOfLines={1} and maxFontSizeMultiplier={fontScaleCaps.compact} (1.5).
 */
export function CopilotActions(props: CopilotActionsProps) {
  const { colors } = useTheme();
  const insets = useContext(SafeAreaInsetsContext);
  const { width } = useWindowDimensions();
  const showIcons = width >= ICON_MIN_WIDTH;
  const bottom = insets?.bottom ?? 0;
  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: spacing.md + bottom }]}>
      <View style={styles.slot}>
        <ActionButton
          label="Auto-fill"
          icon={showIcons ? Zap : undefined}
          testID={TestIds.copilot.autoFill}
          onPress={props.onAutoFill}
          disabled={!props.canAutoFill || !!props.disabled}
          loading={props.filling}
          accessibilityLabel="Auto-fill form fields"
        />
      </View>
      <View style={styles.slot}>
        <ActionButton
          label="Stage CV"
          variant="secondary"
          icon={showIcons ? FileDown : undefined}
          testID={TestIds.copilot.stageResume}
          onPress={props.onStageResume}
          disabled={!!props.disabled}
          loading={props.staging}
          accessibilityLabel="Stage recommended resume and copy cover note"
        />
      </View>
      <View style={styles.slot}>
        <ActionButton
          label={props.logged ? 'Logged' : 'Log'}
          variant="secondary"
          icon={showIcons ? (props.logged ? BookmarkCheck : BookmarkPlus) : undefined}
          testID={TestIds.copilot.logApplication}
          onPress={props.onLogApplication}
          disabled={props.logged || !!props.disabled}
          loading={props.logging}
          accessibilityLabel={props.logged ? 'Application already logged' : 'Log application to Tracker'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  slot: {
    flex: 1,
    minWidth: 96,
  },
  buttonBase: {
    minHeight,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
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
