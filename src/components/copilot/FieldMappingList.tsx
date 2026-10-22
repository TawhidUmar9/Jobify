import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import type { FillSummary } from '../../features/workspace/workspaceReducer';
import type { FieldMapping } from '../../types/domain';

export interface FieldMappingListProps {
  mappings: FieldMapping[];
  scrapedInputCount: number;
  lastFill: FillSummary | null;
  savedAnswerClawIds: string[];
  onSaveAnswer: (mapping: FieldMapping) => void;
}

/** Badge text per source. CONTRACT: UI_DIRECTIVES.md §4.4. */
export const FIELD_SOURCE_LABELS = { PROFILE: 'Profile', ANSWER_BANK: 'Saved answer', GENERATED: 'AI draft' } as const;

/**
 * Preview of what auto-fill writes (TestIds.copilot.fieldMappingList).
 * Title `${mappings.length} of ${scrapedInputCount} fields ready to fill`; lastFill → line
 * `Filled ${filledCount} of ${filledCount + missingCount}`. Row (fieldRow(clawId)): fieldLabel (label,
 * textSecondary) + source badge (caption, outlined) above value (body, 3 lines). GENERATED rows have a
 * ghost Button "Save to answers" (saveAnswer(clawId)); after saving it reads "Saved" (disabled).
 * Empty → "No fillable fields found on this page."
 */
export function FieldMappingList(props: FieldMappingListProps) {
  // TODO(T-033): implement per the rules above.
  return (
    <View testID={TestIds.copilot.fieldMappingList}>
      <Text>
        {props.mappings.length} of {props.scrapedInputCount} fields ready to fill
      </Text>
    </View>
  );
}
