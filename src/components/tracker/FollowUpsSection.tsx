import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import type { Application } from '../../types/domain';

export interface FollowUpsSectionProps {
  due: Application[];
  onOpen: (application: Application) => void;
}

/**
 * List header in Tracker (TestIds.tracker.followUpsSection). Hidden when `due` is empty.
 * Title "Follow-ups due (N)" (headline) with BellRing 20 warningIcon; up to 5 compact rows
 * (TestIds.tracker.followUpRow(id)): "Role · Company" + "Applied 8 days ago" (caption); tap → detail.
 * More than 5 → caption "+N more below".
 */
export function FollowUpsSection({ due, onOpen }: FollowUpsSectionProps) {
  // TODO(T-031): implement per the rules above.
  void onOpen;
  if (due.length === 0) return null;
  return (
    <View testID={TestIds.tracker.followUpsSection}>
      <Text>Follow-ups due ({due.length})</Text>
    </View>
  );
}
