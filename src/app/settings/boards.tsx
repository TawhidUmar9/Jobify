import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BoardForm } from '../../components/forms/BoardForm';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { IconButton } from '../../components/ui/IconButton';
import { ListRow } from '../../components/ui/ListRow';
import { useSnackbar } from '../../components/ui/Snackbar';
import { StateView } from '../../components/ui/StateView';
import { TestIds } from '../../constants/testIds';
import {
  addBoard,
  deleteBoard,
  listBoards,
  reorderBoards,
  updateBoard,
} from '../../db/repositories/boardsRepo';
import { displayHost } from '../../lib/url';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
import type { JobBoard } from '../../types/domain';

/**
 * Settings → Job boards. UI_DIRECTIVES.md §4.3. Rows (boards.row(id)): name + host; trailing IconButtons
 * ArrowUp (boards.moveUp(id), disabled on first), ArrowDown (moveDown, disabled on last), Trash2 (delete →
 * ConfirmDialog). Tap row → BoardForm (edit). "Add board" (boards.add) → BoardForm (add).
 * Reorder writes immediately (reorderBoards). Changes show in Workspace on its next focus.
 */
export default function BoardsSettingsScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const snackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<JobBoard[]>([]);
  const [targetDelete, setTargetDelete] = useState<JobBoard | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<JobBoard | null>(null);
  const [formError, setFormError] = useState<'INVALID_NAME' | 'INVALID_URL' | null>(null);

  const reload = useCallback(async () => {
    try {
      const list = await listBoards(db);
      setBoards(list);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  async function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= boards.length) return;
    const next = [...boards];
    const item = next[index];
    const swap = next[targetIndex];
    if (!item || !swap) return;
    next[index] = swap;
    next[targetIndex] = item;
    setBoards(next);
    await reorderBoards(db, next.map((b) => b.id));
  }

  async function handleDelete() {
    if (!targetDelete) return;
    const boardToDelete = targetDelete;
    setTargetDelete(null);
    await deleteBoard(db, boardToDelete.id);
    snackbar.show('Board deleted');
    await reload();
  }

  async function handleSaveBoard(input: { name: string; url: string }) {
    if (editingBoard) {
      const res = await updateBoard(db, editingBoard.id, input);
      if (!res.ok) {
        if (res.error === 'INVALID_NAME' || res.error === 'INVALID_URL') {
          setFormError(res.error);
        } else {
          snackbar.show('Could not save. Try again.');
        }
        return;
      }
      setEditingBoard(null);
      setFormError(null);
      snackbar.show('Board saved');
      await reload();
    } else {
      const res = await addBoard(db, input);
      if (!res.ok) {
        if (res.error === 'INVALID_NAME' || res.error === 'INVALID_URL') {
          setFormError(res.error);
        } else {
          snackbar.show('Could not save. Try again.');
        }
        return;
      }
      setAddOpen(false);
      setFormError(null);
      snackbar.show('Board saved');
      await reload();
    }
  }

  if (loading) {
    return <StateView kind="loading" message="Loading job boards…" />;
  }

  const isFormVisible = addOpen || editingBoard !== null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]} testID={TestIds.boards.screen}>
      {boards.length === 0 ? (
        <StateView
          kind="empty"
          title="No job boards"
          message="Add a job board to browse and track applications."
          actionLabel="Add board"
          actionTestID={TestIds.boards.add}
          onAction={() => {
            setFormError(null);
            setAddOpen(true);
          }}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {boards.map((board, index) => (
            <ListRow
              key={board.id}
              title={board.name}
              subtitle={displayHost(board.url)}
              testID={TestIds.boards.row(board.id)}
              onPress={() => {
                setEditingBoard(board);
                setFormError(null);
              }}
              trailing={
                <View style={styles.trailing}>
                  <IconButton
                    icon={ArrowUp}
                    testID={TestIds.boards.moveUp(board.id)}
                    disabled={index === 0}
                    accessibilityLabel={`Move ${board.name} up`}
                    onPress={() => void handleMove(index, -1)}
                  />
                  <IconButton
                    icon={ArrowDown}
                    testID={TestIds.boards.moveDown(board.id)}
                    disabled={index === boards.length - 1}
                    accessibilityLabel={`Move ${board.name} down`}
                    onPress={() => void handleMove(index, 1)}
                  />
                  <IconButton
                    icon={Trash2}
                    testID={TestIds.boards.delete(board.id)}
                    accessibilityLabel={`Delete ${board.name}`}
                    onPress={() => setTargetDelete(board)}
                  />
                </View>
              }
            />
          ))}
          <View style={styles.addSection}>
            <Button
              label="Add board"
              testID={TestIds.boards.add}
              onPress={() => {
                setFormError(null);
                setAddOpen(true);
              }}
            />
          </View>
        </ScrollView>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        visible={targetDelete !== null}
        title={`Delete ${targetDelete?.name ?? ''}?`}
        message="This removes the job board from your quick bar."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void handleDelete()}
        onCancel={() => setTargetDelete(null)}
      />

      {/* Add / Edit Form Modal */}
      <BoardForm
        visible={isFormVisible}
        initial={editingBoard ? { name: editingBoard.name, url: editingBoard.url } : null}
        error={formError}
        onSave={(input) => void handleSaveBoard(input)}
        onCancel={() => {
          setAddOpen(false);
          setEditingBoard(null);
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
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addSection: {
    padding: spacing.md,
    marginTop: spacing.sm,
  },
});
