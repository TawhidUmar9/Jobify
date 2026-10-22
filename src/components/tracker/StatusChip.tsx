import { Text } from 'react-native';

import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from '../../types/domain';

export interface StatusChipProps {
  status: ApplicationStatus;
  testID?: string;
}

/** Tone per status. CONTRACT: UI_DIRECTIVES.md §4.5 "Status chip". */
export const STATUS_TONE: Record<ApplicationStatus, 'neutral' | 'primary' | 'warning' | 'success' | 'danger'> = {
  SAVED: 'neutral',
  APPLIED: 'primary',
  INTERVIEWING: 'warning',
  OFFER: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'neutral',
};

/**
 * Non-interactive label. Height 24, padding horizontal spacing.xs, radius pill,
 * typography.caption weight 600, maxFontSizeMultiplier compact.
 * neutral: bg surfaceMuted / textSecondary; primary: 1px primary border / text primary;
 * warning|success|danger: <tone>Bg / <tone>Text.
 */
export function StatusChip({ status, testID }: StatusChipProps) {
  // TODO(T-031): implement per the rules above.
  return <Text testID={testID}>{APPLICATION_STATUS_LABELS[status]}</Text>;
}
