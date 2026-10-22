import { Modal, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** Destructive confirm uses dangerIcon background with onPrimary text. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Centered modal card over colors.scrim (max width 360, radius lg, padding 24). Buttons: ghost
 * "Cancel" (TestIds.confirmDialog.cancel) and primary/destructive confirm (TestIds.confirmDialog.confirm).
 * Hardware back = cancel. Fade 200 ms (none under reduce motion). Used instead of Alert for every
 * destructive action (delete resume/board/answer/application, import backup, remove AI key).
 */
export function ConfirmDialog(props: ConfirmDialogProps) {
  // TODO(T-003): implement per the rules above.
  return (
    <Modal visible={props.visible} transparent onRequestClose={props.onCancel}>
      <View testID={TestIds.confirmDialog.dialog}>
        <Text>{props.title}</Text>
      </View>
    </Modal>
  );
}
