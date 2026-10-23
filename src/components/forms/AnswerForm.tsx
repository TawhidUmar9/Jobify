import { useContext, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, radii, spacing, typography } from '../../theme/tokens';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';

export interface AnswerFormProps {
  visible: boolean;
  initial: { question: string; answer: string } | null;
  error: 'EMPTY' | 'TOO_LONG' | null;
  onSave: (input: { question: string; answer: string }) => void;
  onCancel: () => void;
}

function AnswerFormContent(props: AnswerFormProps) {
  const { colors } = useTheme();
  const insets = useContext(SafeAreaInsetsContext);
  const bottom = (insets?.bottom ?? 0) + spacing.md;
  const [question, setQuestion] = useState(props.initial?.question ?? '');
  const [answer, setAnswer] = useState(props.initial?.answer ?? '');
  const [clientError, setClientError] = useState<'EMPTY' | 'TOO_LONG' | null>(null);

  const activeError = props.error ?? clientError;
  const questionError =
    activeError === 'EMPTY' && question.trim().length === 0
      ? 'Fill in both fields'
      : activeError === 'TOO_LONG' && question.trim().length > 300
        ? 'Too long'
        : undefined;

  const answerError =
    activeError === 'EMPTY' && answer.trim().length === 0
      ? 'Fill in both fields'
      : activeError === 'TOO_LONG' && answer.trim().length > 4000
        ? 'Too long'
        : undefined;

  function handleSave() {
    const trimmedQuestion = question.trim();
    const trimmedAnswer = answer.trim();

    if (trimmedQuestion.length === 0 || trimmedAnswer.length === 0) {
      setClientError('EMPTY');
      return;
    }
    if (trimmedQuestion.length > 300 || trimmedAnswer.length > 4000) {
      setClientError('TOO_LONG');
      return;
    }
    props.onSave({ question: trimmedQuestion, answer: trimmedAnswer });
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.modalOverlay, { backgroundColor: colors.scrim }]}
    >
      <View style={[styles.panel, { backgroundColor: colors.surface, paddingBottom: Math.max(spacing.xl, bottom) }]}>
        <Text
          style={[styles.panelTitle, { color: colors.textPrimary }]}
          maxFontSizeMultiplier={fontScaleCaps.default}
        >
          {props.initial ? 'Edit answer' : 'Add answer'}
        </Text>

        <ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
          <TextField
            label="Question"
            value={question}
            onChangeText={(val) => {
              setQuestion(val);
              setClientError(null);
            }}
            maxLength={300}
            error={questionError}
            testID={TestIds.answers.formQuestion}
          />

          <TextField
            label="Answer"
            value={answer}
            onChangeText={(val) => {
              setAnswer(val);
              setClientError(null);
            }}
            multiline
            numberOfLines={6}
            maxLength={4000}
            error={answerError}
            helper={`${answer.length} / 4000`}
            testID={TestIds.answers.formAnswer}
          />

          <View style={styles.actions}>
            <Button
              label="Save"
              testID={TestIds.answers.formSave}
              onPress={handleSave}
            />
            <Button
              label="Cancel"
              variant="ghost"
              testID={TestIds.answers.formCancel}
              onPress={props.onCancel}
            />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

/**
 * Bottom panel modal: Question (TextField max 300), Answer (multiline, max 4000, live counter
 * "123 / 4000"), Cancel / Save. Errors: EMPTY "Fill in both fields"; TOO_LONG "Too long".
 */
export function AnswerForm(props: AnswerFormProps) {
  if (!props.visible) return null;
  const initialKey = props.initial ? `${props.initial.question}-${props.initial.answer.slice(0, 10)}` : 'add';

  return (
    <Modal visible={props.visible} transparent onRequestClose={props.onCancel} animationType="slide">
      <AnswerFormContent key={initialKey} {...props} />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panel: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    maxHeight: '85%',
  },
  panelTitle: {
    ...typography.headline,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  panelContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
