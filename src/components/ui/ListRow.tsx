import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text } from 'react-native';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  onPress?: () => void;
  testID: string;
  /** Right-side content, e.g. IconButtons. Rendered after the chevron is omitted. */
  trailing?: React.ReactNode;
}

/**
 * Settings/list row: min height 56, padding 16, leading icon 24 (decorative), title bodyStrong,
 * subtitle caption textSecondary (2 lines), trailing ChevronRight when onPress and no trailing.
 * Bottom hairline border. role "button" when pressable.
 */
export function ListRow(props: ListRowProps) {
  // TODO(T-003): implement per the rules above.
  return (
    <Pressable testID={props.testID} onPress={props.onPress} accessibilityRole={props.onPress ? 'button' : undefined}>
      <Text>{props.title}</Text>
      {props.subtitle ? <Text>{props.subtitle}</Text> : null}
      {props.trailing}
    </Pressable>
  );
}
