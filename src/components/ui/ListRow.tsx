import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { iconSizes, iconStrokeWidth, spacing, typography } from '../../theme/tokens';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  onPress?: () => void;
  testID: string;
  /** Right-side content, e.g. IconButtons. Rendered after the chevron is omitted. */
  trailing?: ReactNode;
}

/**
 * Settings/list row: min height 56, padding 16, leading icon 24 (decorative), title bodyStrong,
 * subtitle caption textSecondary (2 lines), trailing ChevronRight when onPress and no trailing.
 * Bottom hairline border. role "button" when pressable.
 */
export function ListRow(props: ListRowProps) {
  const { colors } = useTheme();
  const Icon = props.icon;
  const showChevron = !!props.onPress && props.trailing === undefined;

  return (
    <Pressable
      testID={props.testID}
      onPress={props.onPress}
      accessibilityRole={props.onPress ? 'button' : undefined}
      accessibilityLabel={props.title}
      style={[styles.row, { borderBottomColor: colors.border }]}
    >
      {Icon ? (
        <Icon
          size={iconSizes.lg}
          strokeWidth={iconStrokeWidth}
          color={colors.textSecondary}
          accessible={false}
          importantForAccessibility="no"
        />
      ) : null}
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{props.title}</Text>
        {props.subtitle ? (
          <Text numberOfLines={2} style={[styles.subtitle, { color: colors.textSecondary }]}>
            {props.subtitle}
          </Text>
        ) : null}
      </View>
      {props.trailing}
      {showChevron ? (
        <ChevronRight
          size={iconSizes.lg}
          strokeWidth={iconStrokeWidth}
          color={colors.textSecondary}
          accessible={false}
          importantForAccessibility="no"
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.bodyStrong,
  },
  subtitle: {
    ...typography.caption,
  },
});
