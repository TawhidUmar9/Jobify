import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { radii, spacing, typography } from '../../theme/tokens';
import { Button } from '../ui/Button';

export interface StagingExplainerProps {
  visible: boolean;
  onContinue: () => void;
  onCancel: () => void;
}

/**
 * Android-only, shown once before the first SAF folder picker. UI_DIRECTIVES.md §4.4.
 * - RN Modal transparent, animationType "fade" ("none" under reduce-motion), scrim colors.scrim.
 * - Card bg colors.surface, radius radii.lg, padding spacing.xl, max width 360.
 * - Title "Choose a folder for resumes" (typography.headline).
 * - Body (typography.body): "Android will ask for a folder. Open Download, create a folder named
 *   Jobify, and tap Use this folder. Staged resumes go there so they show first under Recent
 *   when a job site asks for a file."
 * - Buttons: ghost "Cancel" (TestIds.stagingExplainer.cancel), primary "Continue"
 *   (TestIds.stagingExplainer.continue).
 * - onRequestClose (hardware back) → onCancel.
 */
export function StagingExplainer({ visible, onContinue, onCancel }: StagingExplainerProps) {
  const { colors, isReduceMotion } = useTheme();
  const reduceMotion = isReduceMotion;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <View
          testID={TestIds.stagingExplainer.dialog}
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Choose a folder for resumes
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Android will ask for a folder. Open Download, create a folder named Jobify, and tap Use
            this folder. Staged resumes go there so they show first under Recent when a job site asks
            for a file.
          </Text>
          <View style={styles.actions}>
            <Button
              label="Cancel"
              variant="ghost"
              onPress={onCancel}
              testID={TestIds.stagingExplainer.cancel}
            />
            <Button
              label="Continue"
              onPress={onContinue}
              testID={TestIds.stagingExplainer.continue}
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
  body: {
    ...typography.body,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
