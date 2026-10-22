import { CircleCheck, CircleHelp, CircleX, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { iconSizes, iconStrokeWidth, spacing, typography } from '../../theme/tokens';
import { APPLICATION_STATUS_LABELS, type Application, type Eligibility } from '../../types/domain';
import { StatusChip } from './StatusChip';

export interface ApplicationRowProps {
  application: Application;
  onPress: (application: Application) => void;
}

/** Fixed row height used by FlatList getItemLayout. Rows must not exceed it at fontScale 1. */
export const APPLICATION_ROW_HEIGHT = 88;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

const ELIGIBILITY_ICONS: Record<Eligibility, { icon: LucideIcon; tone: 'success' | 'warning' | 'danger' }> = {
  ELIGIBLE: { icon: CircleCheck, tone: 'success' },
  UNCLEAR: { icon: CircleHelp, tone: 'warning' },
  NOT_ELIGIBLE: { icon: CircleX, tone: 'danger' },
};

/** "12 Oct 2026" from a stored "YYYY-MM-DD HH:MM:SS" stamp (calendar date, not shifted). */
export function formatTrackerDate(stamp: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(stamp);
  if (!match) return stamp;
  const month = MONTHS[Number(match[2]) - 1];
  const day = Number(match[3]);
  if (!month || !Number.isFinite(day)) return stamp;
  return `${day} ${month} ${match[1]}`;
}

function parseLocalTimestamp(stamp: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(stamp);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function isFollowUpDue(followUpAt: string | null, now: Date): boolean {
  if (!followUpAt) return false;
  const due = parseLocalTimestamp(followUpAt);
  return due !== null && due.getTime() <= now.getTime();
}

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
  const { colors } = useTheme();
  const date = formatTrackerDate(application.createdAt);
  const eligibility = application.eligibility ? ELIGIBILITY_ICONS[application.eligibility] : null;
  const EligibilityIcon = eligibility?.icon;
  const iconColor = eligibility
    ? { success: colors.successIcon, warning: colors.warningIcon, danger: colors.dangerIcon }[eligibility.tone]
    : undefined;
  const followUpDue = isFollowUpDue(application.followUpAt, new Date());
  const match = application.matchScore !== null ? ` · Match ${application.matchScore}` : '';

  return (
    <Pressable
      testID={TestIds.tracker.row(application.id)}
      accessibilityRole="button"
      accessibilityLabel={`${application.roleTitle} at ${application.companyName}, ${APPLICATION_STATUS_LABELS[application.status]}, added ${date}`}
      onPress={() => onPress(application)}
      style={[styles.row, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
    >
      <View style={styles.text}>
        <Text numberOfLines={1} style={[styles.role, { color: colors.textPrimary }]}>
          {application.roleTitle}
        </Text>
        <Text numberOfLines={1} style={[styles.company, { color: colors.textSecondary }]}>
          {`${application.companyName} · ${application.boardName}`}
        </Text>
        <View style={styles.meta}>
          <Text numberOfLines={1} style={[styles.caption, { color: colors.textSecondary }]}>
            {`${date}${match}`}
          </Text>
          {EligibilityIcon && iconColor ? (
            <EligibilityIcon size={iconSizes.sm} strokeWidth={iconStrokeWidth} color={iconColor} accessible={false} />
          ) : null}
          {followUpDue ? (
            <Text numberOfLines={1} style={[styles.caption, { color: colors.warningText }]}>
              {' · Follow up due'}
            </Text>
          ) : null}
        </View>
      </View>
      <StatusChip status={application.status} testID={TestIds.tracker.statusChip(application.id)} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: APPLICATION_ROW_HEIGHT,
    minHeight: APPLICATION_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  text: {
    flex: 1,
  },
  role: {
    ...typography.bodyStrong,
  },
  company: {
    ...typography.body,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  caption: {
    ...typography.caption,
    flexShrink: 1,
  },
});
