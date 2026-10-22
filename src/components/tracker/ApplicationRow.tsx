import { Pressable, Text } from 'react-native';

import { TestIds } from '../../constants/testIds';
import type { Application } from '../../types/domain';

export interface ApplicationRowProps {
  application: Application;
  onPress: (application: Application) => void;
}

/** Fixed row height used by FlatList getItemLayout. Rows must not exceed it at fontScale 1. */
export const APPLICATION_ROW_HEIGHT = 88;

/**
 * One Tracker row. UI_DIRECTIVES.md §4.5 "Application row".
 * - minHeight APPLICATION_ROW_HEIGHT, padding spacing.md, bg colors.surface, bottom hairline border.
 * - Line 1: roleTitle typography.bodyStrong, numberOfLines 1.
 * - Line 2: `${companyName} · ${boardName}` typography.body textSecondary, numberOfLines 1.
 * - Line 3: date (createdAt as "12 Oct 2026", local time) typography.caption +
 *   `Match ${matchScore}` when not null + eligibility icon (16, tone color, decorative) +
 *   "Follow up due" (caption, warningText) when followUpAt <= now.
 * - Right: StatusChip.
 * - accessibilityRole "button"; accessibilityLabel
 *   `${roleTitle} at ${companyName}, ${status label}, added ${date}`.
 * - testID TestIds.tracker.row(application.id).
 */
export function ApplicationRow({ application, onPress }: ApplicationRowProps) {
  // TODO(T-031): implement per the rules above.
  return (
    <Pressable testID={TestIds.tracker.row(application.id)} onPress={() => onPress(application)}>
      <Text>{application.roleTitle}</Text>
      <Text>{application.companyName}</Text>
    </Pressable>
  );
}
