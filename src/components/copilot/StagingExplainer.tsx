import { Modal, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';

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
  // TODO(T-036): implement per the rules above.
  void onContinue;
  return (
    <Modal visible={visible} transparent onRequestClose={onCancel}>
      <View testID={TestIds.stagingExplainer.dialog}>
        <Text>Choose a folder for resumes</Text>
      </View>
    </Modal>
  );
}
