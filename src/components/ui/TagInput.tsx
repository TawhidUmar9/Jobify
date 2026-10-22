import { Text, View } from 'react-native';

export interface TagInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  /** Base testID; sub-elements use TestIds.tagInput.input/add/chip(testID, i). */
  testID: string;
  placeholder?: string;
  helper?: string;
  /** Max items; the add button disables at the limit. */
  max: number;
  /** Optional transform before adding, e.g. upper-case country codes. Return null to reject. */
  normalize?: (raw: string) => string | null;
}

/**
 * Editable list of short strings shown as removable chips. UI_DIRECTIVES.md §3 "TagInput".
 * - TextField + "Add" button; submit on keyboard "done" too. Trimmed, empty ignored,
 *   case-insensitive duplicates ignored, normalize() null → error "Not valid".
 * - Chips: height 32 (hit 48 via hitSlop), outlined borderStrong, label + X icon; pressing removes.
 *   Chip accessibilityLabel `Remove ${value}`.
 */
export function TagInput(props: TagInputProps) {
  // TODO(T-003): implement per the rules above.
  return (
    <View testID={props.testID}>
      <Text>{props.label}</Text>
      <Text>{props.values.join(', ')}</Text>
    </View>
  );
}
