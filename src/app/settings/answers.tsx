import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AnswerForm } from '../../components/forms/AnswerForm';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { IconButton } from '../../components/ui/IconButton';
import { useSnackbar } from '../../components/ui/Snackbar';
import { StateView } from '../../components/ui/StateView';
import { TestIds } from '../../constants/testIds';
import {
  deleteAnswer,
  listAnswers,
  updateAnswer,
  upsertAnswer,
} from '../../db/repositories/answersRepo';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, spacing, typography } from '../../theme/tokens';
import type { SavedAnswer } from '../../types/domain';

/**
 * Settings → Answer bank. FlatList rows (answers.row(id)): question (bodyStrong, 2 lines) + answer
 * (body, 2 lines, textSecondary) + "Used N times" caption; tap → AnswerForm edit; Trash2 → ConfirmDialog.
 * "Add answer" (answers.add). Empty (answers.empty): "No saved answers" / "Save AI drafts from the copilot,
 * or add answers you reuse, like notice period or salary expectations."
 */
export default function AnswersSettingsScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const snackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<SavedAnswer[]>([]);
  const [targetDelete, setTargetDelete] = useState<SavedAnswer | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState<SavedAnswer | null>(null);
  const [formError, setFormError] = useState<'EMPTY' | 'TOO_LONG' | null>(null);

  const reload = useCallback(async () => {
    try {
      const list = await listAnswers(db);
      setAnswers(list);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  async function handleDelete() {
    if (!targetDelete) return;
    const answerToDelete = targetDelete;
    setTargetDelete(null);
    await deleteAnswer(db, answerToDelete.id);
    snackbar.show('Answer deleted');
    await reload();
  }

  async function handleSaveAnswer(input: { question: string; answer: string }) {
    if (editingAnswer) {
      const res = await updateAnswer(db, editingAnswer.id, input);
      if (!res.ok) {
        if (res.error === 'EMPTY' || res.error === 'TOO_LONG') {
          setFormError(res.error);
        } else {
          snackbar.show('Could not save. Try again.');
        }
        return;
      }
      setEditingAnswer(null);
      setFormError(null);
      snackbar.show('Answer saved');
      await reload();
    } else {
      const res = await upsertAnswer(db, input);
      if (!res.ok) {
        if (res.error === 'EMPTY' || res.error === 'TOO_LONG') {
          setFormError(res.error);
        } else {
          snackbar.show('Could not save. Try again.');
        }
        return;
      }
      setAddOpen(false);
      setFormError(null);
      snackbar.show('Answer saved');
      await reload();
    }
  }

  if (loading) {
    return <StateView kind="loading" message="Loading answers…" />;
  }

  const isFormVisible = addOpen || editingAnswer !== null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID={TestIds.answers.screen}>
      {answers.length === 0 ? (
        <StateView
          kind="empty"
          testID={TestIds.answers.empty}
          title="No saved answers"
          message="Save AI drafts from the copilot, or add answers you reuse, like notice period or salary expectations."
          actionLabel="Add answer"
          actionTestID={TestIds.answers.add}
          onAction={() => {
            setFormError(null);
            setAddOpen(true);
          }}
        />
      ) : (
        <FlatList
          data={answers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <Pressable
              testID={TestIds.answers.row(item.id)}
              onPress={() => {
                setEditingAnswer(item);
                setFormError(null);
              }}
              accessibilityRole="button"
              accessibilityLabel={item.question}
              style={[styles.row, { borderBottomColor: colors.border }]}
            >
              <View style={styles.copy}>
                <Text
                  numberOfLines={2}
                  style={[styles.question, { color: colors.textPrimary }]}
                  maxFontSizeMultiplier={fontScaleCaps.default}
                >
                  {item.question}
                </Text>
                <Text
                  numberOfLines={2}
                  style={[styles.answer, { color: colors.textSecondary }]}
                  maxFontSizeMultiplier={fontScaleCaps.default}
                >
                  {item.answer}
                </Text>
                <Text
                  style={[styles.caption, { color: colors.textSecondary }]}
                  maxFontSizeMultiplier={fontScaleCaps.default}
                >
                  {`Used ${item.useCount} ${item.useCount === 1 ? 'time' : 'times'}`}
                </Text>
              </View>
              <IconButton
                icon={Trash2}
                testID={TestIds.answers.delete(item.id)}
                accessibilityLabel={`Delete answer for ${item.question}`}
                onPress={() => setTargetDelete(item)}
              />
            </Pressable>
          )}
          ListFooterComponent={
            <View style={styles.addSection}>
              <Button
                label="Add answer"
                testID={TestIds.answers.add}
                onPress={() => {
                  setFormError(null);
                  setAddOpen(true);
                }}
              />
            </View>
          }
        />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        visible={targetDelete !== null}
        title="Delete answer?"
        message="This removes the saved answer from your answer bank."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setTargetDelete(null)}
      />

      {/* Add / Edit Form Modal */}
      <AnswerForm
        visible={isFormVisible}
        initial={editingAnswer ? { question: editingAnswer.question, answer: editingAnswer.answer } : null}
        error={formError}
        onSave={(input) => void handleSaveAnswer(input)}
        onCancel={() => {
          setAddOpen(false);
          setEditingAnswer(null);
          setFormError(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  question: {
    ...typography.bodyStrong,
  },
  answer: {
    ...typography.body,
  },
  caption: {
    ...typography.caption,
  },
  addSection: {
    padding: spacing.md,
    marginTop: spacing.sm,
  },
});
