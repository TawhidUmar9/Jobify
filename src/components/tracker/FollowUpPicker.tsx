import { Modal, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

/** Quick choices instead of a date picker (no extra dependency). CONTRACT: UI_DIRECTIVES.md §4.6. */
export const FOLLOW_UP_OPTIONS = [
  { key: '3d', label: 'In 3 days', days: 3 },
  { key: '1w', label: 'In 1 week', days: 7 },
  { key: '2w', label: 'In 2 weeks', days: 14 },
  { key: 'none', label: 'No reminder', days: null },
] as const;

export type FollowUpOptionKey = (typeof FOLLOW_UP_OPTIONS)[number]['key'];

export interface FollowUpPickerProps {
  visible: boolean;
  onSelect: (key: FollowUpOptionKey) => void;
  onCancel: () => void;
}

/**
 * Bottom panel modal like StatusPicker: title "Follow-up reminder", one 56-tall row per option
 * (TestIds.detail.followUpOption(key)), Cancel. The screen converts the choice with followUpAtFromOption.
 */
export function FollowUpPicker(props: FollowUpPickerProps) {
  // TODO(T-037): implement per the rules above.
  return (
    <Modal visible={props.visible} transparent onRequestClose={props.onCancel}>
      <View testID={TestIds.detail.followUp} />
    </Modal>
  );
}

/** UTC "YYYY-MM-DD HH:MM:SS" `days` after `now`, or null for 'none'. Pure. */
export function followUpAtFromOption(key: FollowUpOptionKey, now: Date): string | null {
  // TODO(T-037): implement.
  void key;
  void now;
  return null;
}
