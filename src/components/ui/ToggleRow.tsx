import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { spacing, typography } from '../../theme/tokens';

export interface ToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  testID: string;
}

/** Row with label (+ description) and a native Switch. Whole row toggles; min height 56; role "switch". */
export function ToggleRow(props: ToggleRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="switch"
      accessibilityLabel={props.label}
      accessibilityState={{ checked: props.value }}
      onPress={() => props.onValueChange(!props.value)}
      style={[styles.row, { borderBottomColor: colors.border }]}
    >
      <View style={styles.copy}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{props.label}</Text>
        {props.description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]}>{props.description}</Text>
        ) : null}
      </View>
      <Switch
        value={props.value}
        onValueChange={props.onValueChange}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        trackColor={{ false: colors.borderStrong, true: colors.primary }}
        thumbColor={colors.surface}
      />
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
  label: {
    ...typography.bodyStrong,
  },
  description: {
    ...typography.caption,
  },
});
