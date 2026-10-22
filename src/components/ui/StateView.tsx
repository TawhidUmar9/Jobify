import { Text, View } from 'react-native';

export type StateViewProps =
  | { kind: 'loading'; message: string; testID?: string }
  | {
      kind: 'empty' | 'error';
      title: string;
      message: string;
      actionLabel?: string;
      onAction?: () => void;
      testID?: string;
      actionTestID?: string;
    };

/**
 * Full-area placeholder for loading, empty, and error states. UI_DIRECTIVES.md §3 "StateView".
 * - Centered column, max width 320, padding spacing.xl.
 * - loading: ActivityIndicator (colors.primary, size "large") + message (typography.body,
 *   colors.textSecondary). accessibilityLiveRegion "polite" / accessibilityRole "progressbar".
 * - empty: title (typography.headline) + message (typography.body, textSecondary) + optional
 *   secondary Button.
 * - error: same as empty but message is announced: AccessibilityInfo.announceForAccessibility
 *   on mount; optional primary Button for retry.
 * - No illustrations, no emoji.
 */
export function StateView(props: StateViewProps) {
  // TODO(T-002): implement per the rules above.
  return (
    <View testID={props.testID}>
      <Text>{props.kind === 'loading' ? props.message : props.title}</Text>
    </View>
  );
}
