import { Modal, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

export interface BoardFormProps {
  visible: boolean;
  /** null = add; otherwise edit with initial values. */
  initial: { name: string; url: string } | null;
  /** Error from boardsRepo: shown under the matching field. */
  error: 'INVALID_NAME' | 'INVALID_URL' | null;
  onSave: (input: { name: string; url: string }) => void;
  onCancel: () => void;
}

/**
 * Bottom panel modal: Name (TextField max 16, TestIds.boards.formName), URL (keyboard url,
 * TestIds.boards.formUrl; input normalized with normalizeAddressInput on save), Cancel / Save.
 * Errors: INVALID_NAME "Use 1–16 characters"; INVALID_URL "Enter a full https:// address".
 */
export function BoardForm(props: BoardFormProps) {
  // TODO(T-040): implement per the rules above.
  return (
    <Modal visible={props.visible} transparent onRequestClose={props.onCancel}>
      <View testID={TestIds.boards.formName} />
    </Modal>
  );
}
