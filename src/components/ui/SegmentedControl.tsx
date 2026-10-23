import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, radii, spacing, touchTarget, typography } from '../../theme/tokens';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  testID: string;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly SegmentOption<T>[];
  /** Selected values. Single-select when `multiple` is false. */
  selected: readonly T[];
  onChange: (selected: T[]) => void;
  multiple?: boolean;
}

/**
 * Row of equal-width segments (2–4). Selected: bg primary/onPrimary; else surface + borderStrong.
 * Height 48. Single-select uses role "radio", multi uses "checkbox"; accessibilityState checked.
 * Multi-select never allows deselecting the last selected option.
 */
export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const multiple = !!props.multiple;

  function press(value: T) {
    const isSelected = props.selected.includes(value);
    if (multiple) {
      if (isSelected) {
        if (props.selected.length <= 1) return;
        props.onChange(props.selected.filter((item) => item !== value));
        return;
      }
      props.onChange([...props.selected, value]);
      return;
    }
    if (isSelected) return;
    props.onChange([value]);
  }

  return (
    <View style={styles.wrap}>
      <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.label, { color: colors.textPrimary }]}>{props.label}</Text>
      <View style={styles.row}>
        {props.options.map((option) => {
          const checked = props.selected.includes(option.value);
          return (
            <Pressable
              key={option.value}
              testID={option.testID}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityLabel={option.label}
              accessibilityState={{ checked }}
              onPress={() => press(option.value)}
              style={[
                styles.segment,
                {
                  backgroundColor: checked ? colors.primary : colors.surface,
                  borderColor: checked ? colors.primary : colors.borderStrong,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={fontScaleCaps.compact}
                style={[styles.segmentLabel, { color: checked ? colors.onPrimary : colors.textPrimary }]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xxs,
  },
  label: {
    ...typography.label,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    height: touchTarget.android,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  segmentLabel: {
    ...typography.bodyStrong,
  },
});
