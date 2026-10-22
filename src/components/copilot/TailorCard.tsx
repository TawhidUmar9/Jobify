import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import type { TailorState } from '../../features/workspace/workspaceReducer';

export interface TailorCardProps {
  tailor: TailorState;
  onTailor: () => void;
  onCopy: (text: string) => void;
}

/**
 * "Improve my application" section. UI_DIRECTIVES.md §4.4 "Tailor card".
 * idle → secondary Button "Improve my application" (Wand2 icon, TestIds.copilot.tailorButton) +
 *   caption "Suggestions, cover note and DM. Uses one more AI request."
 * loading → inline spinner + "Writing suggestions…" (tailorLoading).
 * error → message from AI_ERROR_MESSAGES + "Try again" (tailorError).
 * ready (tailorCard) → "Emphasize" bullet list (emphasize); bullet rewrites (bulletRewrite(i)):
 *   original (caption, textSecondary, strikethrough none) → suggested (body) + reason (caption);
 *   "Cover note" text (coverNote, selectable) + Copy (copyCoverNote); "Cold DM" text (coldDm) + Copy (copyDm).
 *   Empty coverNote/coldDm blocks are hidden.
 */
export function TailorCard({ tailor, onTailor, onCopy }: TailorCardProps) {
  // TODO(T-034): implement per the rules above.
  void onTailor;
  void onCopy;
  return (
    <View testID={TestIds.copilot.tailorCard}>
      <Text>{tailor.status}</Text>
    </View>
  );
}
