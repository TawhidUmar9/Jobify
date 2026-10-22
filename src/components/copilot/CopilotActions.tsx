import { View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { Button } from '../ui/Button';

export interface CopilotActionsProps {
  canAutoFill: boolean;
  filling: boolean;
  staging: boolean;
  logged: boolean;
  logging: boolean;
  onAutoFill: () => void;
  onStageResume: () => void;
  onLogApplication: () => void;
}

/**
 * Bottom action row inside the sheet footer. UI_DIRECTIVES.md §4.4 "Copilot actions".
 * Three buttons, equal width, gap spacing.xs, padding spacing.md, top hairline colors.border,
 * bottom padding includes safe-area inset:
 * 1. primary  "Auto-fill"   lucide Zap      TestIds.copilot.autoFill        disabled !canAutoFill, loading filling
 * 2. secondary "Stage CV"   lucide FileDown TestIds.copilot.stageResume     loading staging
 * 3. secondary "Log" / "Logged" lucide BookmarkPlus / BookmarkCheck  TestIds.copilot.logApplication
 *    disabled when logged; loading logging.
 * accessibilityLabels: "Auto-fill form fields", "Stage recommended resume and copy cover note",
 * "Log application to Tracker" / "Application already logged".
 * On screens < 360dp wide, labels stay; icons are dropped.
 */
export function CopilotActions(props: CopilotActionsProps) {
  // TODO(T-030): Log button. TODO(T-033): Auto-fill. TODO(T-036): Stage CV. Layout per rules above.
  return (
    <View style={{ flexDirection: 'row' }}>
      <Button
        label="Auto-fill"
        testID={TestIds.copilot.autoFill}
        onPress={props.onAutoFill}
        disabled={!props.canAutoFill}
        loading={props.filling}
      />
      <Button
        label="Stage CV"
        variant="secondary"
        testID={TestIds.copilot.stageResume}
        onPress={props.onStageResume}
        loading={props.staging}
      />
      <Button
        label={props.logged ? 'Logged' : 'Log'}
        variant="secondary"
        testID={TestIds.copilot.logApplication}
        onPress={props.onLogApplication}
        disabled={props.logged}
        loading={props.logging}
      />
    </View>
  );
}
