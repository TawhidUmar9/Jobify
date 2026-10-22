import { StyleSheet, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import type { FillSummary } from '../../features/workspace/workspaceReducer';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, radii, spacing, typography } from '../../theme/tokens';
import type { FieldMapping } from '../../types/domain';
import { Button } from '../ui/Button';

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
  const { colors } = useTheme();

  return (
    <View testID={TestIds.copilot.fieldMappingList} style={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary }]} maxFontSizeMultiplier={fontScaleCaps.default}>
        {`${props.mappings.length} of ${props.scrapedInputCount} fields ready to fill`}
      </Text>
      {props.lastFill !== null && (
        <Text style={[styles.lastFill, { color: colors.textSecondary }]} maxFontSizeMultiplier={fontScaleCaps.default}>
          {`Filled ${props.lastFill.filledCount} of ${props.lastFill.filledCount + props.lastFill.missingCount}`}
        </Text>
      )}
      {props.mappings.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]} maxFontSizeMultiplier={fontScaleCaps.default}>
          No fillable fields found on this page.
        </Text>
      ) : (
        props.mappings.map((mapping) => {
          const isGenerated = mapping.source === 'GENERATED';
          const saved = props.savedAnswerClawIds.includes(mapping.clawId);
          return (
            <View
              key={mapping.clawId}
              testID={TestIds.copilot.fieldRow(mapping.clawId)}
              style={[styles.row, { borderColor: colors.border }]}
            >
              <View style={styles.header}>
                <Text
                  style={[styles.fieldLabel, { color: colors.textSecondary }]}
                  maxFontSizeMultiplier={fontScaleCaps.default}
                >
                  {mapping.fieldLabel}
                </Text>
                <View style={[styles.badge, { borderColor: colors.border }]}>
                  <Text
                    style={[styles.badgeText, { color: colors.textSecondary }]}
                    maxFontSizeMultiplier={fontScaleCaps.default}
                  >
                    {FIELD_SOURCE_LABELS[mapping.source] ?? mapping.source}
                  </Text>
                </View>
              </View>
              <Text
                style={[styles.value, { color: colors.textPrimary }]}
                numberOfLines={3}
                maxFontSizeMultiplier={fontScaleCaps.default}
              >
                {mapping.value}
              </Text>
              {isGenerated && (
                <View style={styles.actionRow}>
                  <Button
                    variant="ghost"
                    label={saved ? 'Saved' : 'Save to answers'}
                    disabled={saved}
                    testID={TestIds.copilot.saveAnswer(mapping.clawId)}
                    onPress={() => props.onSaveAnswer(mapping)}
                  />
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  title: {
    ...typography.headline,
  },
  lastFill: {
    ...typography.caption,
  },
  empty: {
    ...typography.body,
  },
  row: {
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.label,
    flex: 1,
  },
  badge: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  badgeText: {
    ...typography.caption,
  },
  value: {
    ...typography.body,
  },
  actionRow: {
    alignItems: 'flex-start',
    marginTop: spacing.xs,
  },
});
