import { useContext, useEffect, useState } from 'react';
import { AccessibilityInfo, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { radii, spacing, typography } from '../../theme/tokens';
import { Button } from '../ui/Button';

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
          style={[
            styles.panel,
            { backgroundColor: colors.surface, paddingBottom: bottom },
          ]}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>Follow-up reminder</Text>
          {FOLLOW_UP_OPTIONS.map((option) => (
            <Pressable
              key={option.key}
              testID={TestIds.detail.followUpOption(option.key)}
              accessibilityRole="radio"
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => props.onSelect(option.key)}
            >
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{option.label}</Text>
            </Pressable>
          ))}
          <View style={styles.cancelWrapper}>
            <Button label="Cancel" variant="ghost" onPress={props.onCancel} />
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

/** UTC "YYYY-MM-DD HH:MM:SS" `days` after `now`, or null for 'none'. Pure. */
export function followUpAtFromOption(key: FollowUpOptionKey, now: Date): string | null {
  const option = FOLLOW_UP_OPTIONS.find((opt) => opt.key === key);
  if (!option || option.days === null) {
    return null;
  }
  const target = new Date(now.getTime() + option.days * 86400000);
  const YYYY = target.getUTCFullYear();
  const MM = String(target.getUTCMonth() + 1).padStart(2, '0');
  const DD = String(target.getUTCDate()).padStart(2, '0');
  const HH = String(target.getUTCHours()).padStart(2, '0');
  const mm = String(target.getUTCMinutes()).padStart(2, '0');
  const ss = String(target.getUTCSeconds()).padStart(2, '0');
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
}
