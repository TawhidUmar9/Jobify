import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import type { Eligibility } from '../../types/domain';

export interface EligibilityBadgeProps {
  eligibility: Eligibility;
  reason: string;
}

/** Visual mapping. CONTRACT: UI_DIRECTIVES.md §4.4. */
export const ELIGIBILITY_PRESENTATION: Record<
  Eligibility,
  { label: string; tone: 'success' | 'warning' | 'danger'; icon: 'CircleCheck' | 'CircleHelp' | 'CircleX' }
> = {
  ELIGIBLE: { label: 'You can apply', tone: 'success', icon: 'CircleCheck' },
  UNCLEAR: { label: 'Eligibility unclear', tone: 'warning', icon: 'CircleHelp' },
  NOT_ELIGIBLE: { label: 'Likely not eligible', tone: 'danger', icon: 'CircleX' },
};

/**
 * Pill with tone bg, tone icon 16, label (TestIds.copilot.eligibilityBadge, accessibilityLabel
 * `Eligibility: ${label}`), reason below (body, textSecondary, TestIds.copilot.eligibilityReason).
 */
export function EligibilityBadge({ eligibility, reason }: EligibilityBadgeProps) {
  // TODO(T-029): implement per the rules above.
  return (
    <View testID={TestIds.copilot.eligibilityBadge}>
      <Text>{ELIGIBILITY_PRESENTATION[eligibility].label}</Text>
      <Text testID={TestIds.copilot.eligibilityReason}>{reason}</Text>
    </View>
  );
}
