import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useMemo } from 'react';
import { Text } from 'react-native';

import { TestIds } from '../../constants/testIds';
import type { WorkspaceState } from '../../features/workspace/workspaceReducer';
import type { FieldMapping, Resume } from '../../types/domain';

export interface CopilotSheetProps {
  state: WorkspaceState;
  recommendedResume: Resume | null;
  isOnSourcePage: boolean;
  staging: boolean;
  logging: boolean;
  onClose: () => void;
  onReanalyze: () => void;
  onAutoFill: () => void;
  onTailor: () => void;
  onSaveAnswer: (mapping: FieldMapping) => void;
  onStageResume: () => void;
  onLogApplication: () => void;
  onCopy: (text: string) => void;
  /** Error-state secondary action, e.g. NO_PROFILE → open Settings → Profile; AI config errors → Settings → AI. */
  onOpenSettings: (path: '/settings/ai' | '/settings/profile') => void;
}

/**
 * Gorhom BottomSheet with analysis results. UI_DIRECTIVES.md §4.4 "Copilot sheet".
 * - Controlled by state.sheetOpen via ref (snapToIndex(0) / close()); snapPoints ['50%', '92%'];
 *   enablePanDownToClose; onClose → props.onClose; BottomSheetBackdrop (pressBehavior close).
 * - Header (sticky): "Copilot" + IconButton RefreshCw (reanalyze, disabled while busy) + X (close).
 * - Body by phase:
 *   scraping → StateView loading "Reading the page…"; analyzing → "Asking the AI…" (TestIds.copilot.loading).
 *   error → StateView error (copilot-error) with copy from UI_DIRECTIVES §6 + "Try again" (copilot-retry);
 *     NO_PROFILE and AI codes NOT_CONFIGURED/AUTH/MODEL_NOT_FOUND/BAD_REQUEST also show a secondary
 *     button (copilot-error-action): "Open profile" / "Open AI settings".
 *   ready/filling → EligibilityBadge, RedFlagList, MatchCard, SkillChips (matched, missing),
 *     TailorCard, FieldMappingList, stale notice when !isOnSourcePage; CopilotActions in BottomSheetFooter.
 */
export function CopilotSheet(props: CopilotSheetProps) {
  // TODO(T-028): shell + states. TODO(T-029): result cards. TODO(T-030): actions footer.
  const snapPoints = useMemo(() => ['50%', '92%'], []);
  return (
    <BottomSheet index={props.state.sheetOpen ? 0 : -1} snapPoints={snapPoints} enablePanDownToClose onClose={props.onClose}>
      <BottomSheetScrollView testID={TestIds.copilot.sheet}>
        <Text>Copilot ({props.state.phase})</Text>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
