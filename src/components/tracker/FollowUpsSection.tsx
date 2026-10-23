import { BellRing } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { parseDbTimestamp } from '../../lib/dates';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, iconSizes, iconStrokeWidth, spacing, typography } from '../../theme/tokens';
import type { Application } from '../../types/domain';

export interface FollowUpsSectionProps {
  due: Application[];
  onOpen: (application: Application) => void;
}

const VISIBLE_LIMIT = 5;
const DAY_MS = 86_400_000;

function calendarDay(year: number, monthIndex: number, day: number): number {
  return Date.UTC(year, monthIndex, day);
}

/** Whole local calendar days from the stored UTC stamp to `now`. */
function daysSince(stamp: string, now: Date): number | null {
  const stored = parseDbTimestamp(stamp);
  if (stored === null) return null;
  const created = calendarDay(stored.getFullYear(), stored.getMonth(), stored.getDate());
  const today = calendarDay(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((today - created) / DAY_MS));
}

function appliedAgo(stamp: string, now: Date): string {
  const days = daysSince(stamp, now);
  if (days === null) return 'Applied';
  if (days === 0) return 'Applied today';
  if (days === 1) return 'Applied 1 day ago';
  return `Applied ${days} days ago`;
}

/**
 * List header in Tracker (TestIds.tracker.followUpsSection). Hidden when `due` is empty.
 * Title "Follow-ups due (N)" (headline) with BellRing 20 warningIcon; up to 5 compact rows
 * (TestIds.tracker.followUpRow(id)): "Role · Company" + "Applied 8 days ago" (caption); tap → detail.
 * More than 5 → caption "+N more below".
 */
export function FollowUpsSection({ due, onOpen }: FollowUpsSectionProps) {
  const { colors } = useTheme();
  if (due.length === 0) return null;
  const now = new Date();
  const visible = due.slice(0, VISIBLE_LIMIT);
  const extra = due.length - visible.length;

  return (
    <View testID={TestIds.tracker.followUpsSection} style={styles.section}>
      <View style={styles.titleRow}>
        <BellRing size={iconSizes.md} strokeWidth={iconStrokeWidth} color={colors.warningIcon} accessible={false} />
        <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.title, { color: colors.textPrimary }]}>{`Follow-ups due (${due.length})`}</Text>
      </View>
      {visible.map((application) => (
        <Pressable
          key={application.id}
          testID={TestIds.tracker.followUpRow(application.id)}
          accessibilityRole="button"
          accessibilityLabel={`${application.roleTitle} at ${application.companyName}`}
          onPress={() => onOpen(application)}
          style={styles.row}
        >
          <Text numberOfLines={1} maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.role, { color: colors.textPrimary }]}>
            {`${application.roleTitle} · ${application.companyName}`}
          </Text>
          <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.ago, { color: colors.textSecondary }]}>{appliedAgo(application.createdAt, now)}</Text>
        </Pressable>
      ))}
      {extra > 0 ? (
        <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.more, { color: colors.textSecondary }]}>{`+${extra} more below`}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.headline,
  },
  row: {
    paddingVertical: spacing.xs,
  },
  role: {
    ...typography.body,
  },
  ago: {
    ...typography.caption,
  },
  more: {
    ...typography.caption,
  },
});
