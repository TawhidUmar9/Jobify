import { Check } from 'lucide-react-native';
import { useContext, useEffect, useState } from 'react';
import { AccessibilityInfo, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, iconStrokeWidth, radii, spacing, typography } from '../../theme/tokens';
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from '../../types/domain';
import { Button } from '../ui/Button';

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
  const { colors } = useTheme();
  const insets = useContext(SafeAreaInsetsContext);
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

  const bottom = (insets?.bottom ?? 0) + spacing.md;

  return (
    <Modal
      visible={props.visible}
      transparent
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={props.onCancel}
      statusBarTranslucent
    >
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <Pressable style={styles.scrimBackdrop} onPress={props.onCancel} accessible={false} />
        <View
          testID={TestIds.statusPicker.sheet}
          accessibilityViewIsModal
          aria-modal={true}
          style={[
            styles.panel,
            { backgroundColor: colors.surface, paddingBottom: bottom },
          ]}
        >
          <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.title, { color: colors.textPrimary }]}>Change status</Text>
          {APPLICATION_STATUSES.map((status) => {
            const isChecked = status === props.current;
            return (
              <Pressable
                key={status}
                testID={TestIds.statusPicker.option(status)}
                accessibilityRole="radio"
                accessibilityLabel={APPLICATION_STATUS_LABELS[status]}
                accessibilityState={{ checked: isChecked }}
                style={[styles.row, { borderBottomColor: colors.border }]}
                onPress={() => {
                  if (isChecked) {
                    props.onCancel();
                  } else {
                    props.onSelect(status);
                  }
                }}
              >
                <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.rowLabel, { color: colors.textPrimary }]}>
                  {APPLICATION_STATUS_LABELS[status]}
                </Text>
                {isChecked ? (
                  <Check
                    size={20}
                    strokeWidth={iconStrokeWidth}
                    color={colors.primary}
                    accessible={false}
                  />
                ) : null}
              </Pressable>
            );
          })}
          <View style={styles.cancelWrapper}>
            <Button
              label="Cancel"
              variant="ghost"
              testID={TestIds.statusPicker.cancel}
              onPress={props.onCancel}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrimBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  panel: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  title: {
    ...typography.headline,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
  },
  rowLabel: {
    ...typography.body,
  },
  cancelWrapper: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
});
