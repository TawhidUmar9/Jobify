import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import type { RedFlag, RedFlagCode } from '../../types/domain';

/** Short titles per code. CONTRACT: UI_DIRECTIVES.md §4.4. */
export const RED_FLAG_TITLES: Record<RedFlagCode, string> = {
  LOCATION_OR_AUTHORIZATION: 'Location or work permit limit',
  TIMEZONE_MISMATCH: 'Time-zone mismatch',
  UNPAID_TRIAL_WORK: 'Unpaid trial work',
  NO_SALARY_INFO: 'No salary listed',
  SALARY_BELOW_MINIMUM: 'Below your minimum salary',
  STALE_POSTING: 'Old posting',
  BLOCKED_COMPANY: 'Company on your avoid list',
  OTHER: 'Heads-up',
};

/**
 * Section "Red flags" (TestIds.copilot.redFlags). Each row (TestIds.copilot.redFlag(i)):
 * TriangleAlert 16 warningIcon + title (bodyStrong) + detail (body, textSecondary).
 * Empty list → single line "No red flags found" with ShieldCheck 16 successIcon.
 */
export function RedFlagList({ flags }: { flags: RedFlag[] }) {
  // TODO(T-029): implement per the rules above.
  return (
    <View testID={TestIds.copilot.redFlags}>
      {flags.map((f, i) => (
        <Text key={`${f.code}-${i}`} testID={TestIds.copilot.redFlag(i)}>
          {RED_FLAG_TITLES[f.code]}: {f.detail}
        </Text>
      ))}
    </View>
  );
}
