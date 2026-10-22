import { Modal, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

export interface AnswerFormProps {
  visible: boolean;
  initial: { question: string; answer: string } | null;
  error: 'EMPTY' | 'TOO_LONG' | null;
  onSave: (input: { question: string; answer: string }) => void;
  onCancel: () => void;
}

/**
 * Bottom panel modal: Question (TextField max 300), Answer (multiline, max 4000, live counter
 * "123 / 4000"), Cancel / Save. Errors: EMPTY "Fill in both fields"; TOO_LONG "Too long".
 */
export function AnswerForm(props: AnswerFormProps) {
  // TODO(T-041): implement per the rules above.
  return (
    <Modal visible={props.visible} transparent onRequestClose={props.onCancel}>
      <View testID={TestIds.answers.formQuestion} />
    </Modal>
  );
}
