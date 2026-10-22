import type { LucideIcon } from 'lucide-react-native';
import { useContext } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/tokens';
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

/** Below this width the row keeps labels and drops icons. */
const ICON_MIN_WIDTH = 360;

/**
 * Loaded on demand. A static import breaks the Jest harness: lucide ships ESM that this
 * project's transformIgnorePatterns does not compile, and tests/contracts renders this row.
 */
function lucideIcon(name: string): LucideIcon | undefined {
  try {
    // Static import breaks the Jest harness: lucide ships untransformed ESM.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const icons = require('lucide-react-native') as Record<string, LucideIcon>;
    const icon = icons[name];
    return typeof icon === 'function' ? icon : undefined;
  } catch {
    return undefined;
  }
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
  // TODO(T-033): Auto-fill. TODO(T-036): Stage CV.
  const { colors } = useTheme();
  const insets = useContext(SafeAreaInsetsContext);
  const { width } = useWindowDimensions();
  const showIcons = width >= ICON_MIN_WIDTH;
  const bottom = insets?.bottom ?? 0;
  return (
    <View style={[styles.row, { borderTopColor: colors.border, paddingBottom: spacing.md + bottom }]}>
      <View style={styles.slot}>
        <Button
          label="Auto-fill"
          icon={showIcons ? lucideIcon('Zap') : undefined}
          testID={TestIds.copilot.autoFill}
          onPress={props.onAutoFill}
          disabled={!props.canAutoFill}
          loading={props.filling}
          accessibilityLabel="Auto-fill form fields"
        />
      </View>
      <View style={styles.slot}>
        <Button
          label="Stage CV"
          variant="secondary"
          icon={showIcons ? lucideIcon('FileDown') : undefined}
          testID={TestIds.copilot.stageResume}
          onPress={props.onStageResume}
          loading={props.staging}
          accessibilityLabel="Stage recommended resume and copy cover note"
        />
      </View>
      <View style={styles.slot}>
        <Button
          label={props.logged ? 'Logged' : 'Log'}
          variant="secondary"
          icon={showIcons ? lucideIcon(props.logged ? 'BookmarkCheck' : 'BookmarkPlus') : undefined}
          testID={TestIds.copilot.logApplication}
          onPress={props.onLogApplication}
          disabled={props.logged}
          loading={props.logging}
          accessibilityLabel={props.logged ? 'Application already logged' : 'Log application to Tracker'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  slot: {
    flex: 1,
  },
});
