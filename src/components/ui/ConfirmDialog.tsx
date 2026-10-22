import { useEffect, useState } from 'react';
import { AccessibilityInfo, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { radii, spacing, touchTarget, typography } from '../../theme/tokens';
import { Button } from './Button';

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
  const { colors } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    const pending = AccessibilityInfo.isReduceMotionEnabled();
    if (typeof pending?.then === 'function') {
      pending
        .then((enabled) => {
          if (active) setReduceMotion(enabled);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, []);

  return (
    <Modal
      visible={props.visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={props.onCancel}
      statusBarTranslucent
    >
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <View
          testID={TestIds.confirmDialog.dialog}
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>{props.title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{props.message}</Text>
          <View style={styles.actions}>
            <Button
              label="Cancel"
              variant="ghost"
              onPress={props.onCancel}
              testID={TestIds.confirmDialog.cancel}
            />
            {props.destructive ? (
              <Pressable
                testID={TestIds.confirmDialog.confirm}
                accessibilityRole="button"
                accessibilityLabel={props.confirmLabel}
                onPress={props.onConfirm}
                style={[styles.destructive, { backgroundColor: colors.dangerIcon }]}
              >
                <Text style={[styles.destructiveLabel, { color: colors.onPrimary }]}>{props.confirmLabel}</Text>
              </Pressable>
            ) : (
              <Button
                label={props.confirmLabel}
                onPress={props.onConfirm}
                testID={TestIds.confirmDialog.confirm}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    ...typography.headline,
  },
  message: {
    ...typography.body,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  destructive: {
    minHeight: touchTarget.android,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveLabel: {
    ...typography.bodyStrong,
  },
});
