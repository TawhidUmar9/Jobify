import { Modal, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import type { ApplicationStatus } from '../../types/domain';

export interface StatusPickerProps {
  visible: boolean;
  current: ApplicationStatus;
  onSelect: (status: ApplicationStatus) => void;
  onCancel: () => void;
}

/**
 * Status chooser. UI_DIRECTIVES.md §4.6 "Status picker".
 * - RN Modal transparent, slide from bottom ("none" under reduce-motion), scrim colors.scrim,
 *   tapping the scrim → onCancel; hardware back → onCancel.
 * - Panel bg colors.surface, top radius radii.lg, bottom padding = safe-area inset + spacing.md.
 * - Title "Change status" typography.headline.
 * - One row per APPLICATION_STATUSES in order: height 56, label APPLICATION_STATUS_LABELS,
 *   lucide Check 20 colors.primary on the current one; accessibilityRole "radio",
 *   accessibilityState {checked}; testID TestIds.statusPicker.option(status).
 * - Ghost Button "Cancel" (TestIds.statusPicker.cancel).
 * - Selecting the current status calls onCancel (no write).
 */
export function StatusPicker(props: StatusPickerProps) {
  // TODO(T-037): implement per the rules above.
  return (
    <Modal visible={props.visible} transparent onRequestClose={props.onCancel}>
      <View testID={TestIds.statusPicker.sheet} />
    </Modal>
  );
}
