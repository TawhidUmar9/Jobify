import { Pressable, Text, View } from 'react-native';

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
  // TODO(T-003): implement per the rules above.
  return (
    <View>
      <Text>{props.label}</Text>
      {props.options.map((o) => (
        <Pressable key={o.value} testID={o.testID} onPress={() => props.onChange([o.value])}>
          <Text>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
