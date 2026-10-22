import { useState } from 'react';
import { X } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, iconSizes, iconStrokeWidth, radii, spacing, touchTarget, typography } from '../../theme/tokens';
import { Button } from './Button';
import { TextField } from './TextField';

export interface TagInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  /** Base testID; sub-elements use TestIds.tagInput.input/add/chip(testID, i). */
  testID: string;
  placeholder?: string;
  helper?: string;
  /** Max items; the add button disables at the limit. */
  max: number;
  /** Optional transform before adding, e.g. upper-case country codes. Return null to reject. */
  normalize?: (raw: string) => string | null;
}

const CHIP_HEIGHT = 32;

/**
 * Editable list of short strings shown as removable chips. UI_DIRECTIVES.md §3 "TagInput".
 * - TextField + "Add" button; submit on keyboard "done" too. Trimmed, empty ignored,
 *   case-insensitive duplicates ignored, normalize() null → error "Not valid".
 * - Chips: height 32 (hit 48 via hitSlop), outlined borderStrong, label + X icon; pressing removes.
 *   Chip accessibilityLabel `Remove ${value}`.
 */
export function TagInput(props: TagInputProps) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const atMax = props.values.length >= props.max;
  const chipSlop = (touchTarget.android - CHIP_HEIGHT) / 2;

  function add() {
    const trimmed = draft.trim();
    if (!trimmed || atMax) return;
    const normalized = props.normalize ? props.normalize(trimmed) : trimmed;
    if (normalized === null) {
      setError('Not valid');
      return;
    }
    const value = normalized.trim();
    if (!value) {
      setError('Not valid');
      return;
    }
    const duplicate = props.values.some((existing) => existing.toLowerCase() === value.toLowerCase());
    if (duplicate) {
      setDraft('');
      setError(null);
      return;
    }
    props.onChange([...props.values, value]);
    setDraft('');
    setError(null);
  }

  function remove(index: number) {
    props.onChange(props.values.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <View testID={props.testID} style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.field}>
          <TextField
            label={props.label}
            value={draft}
            onChangeText={(text) => {
              setDraft(text);
              if (error) setError(null);
            }}
            testID={TestIds.tagInput.input(props.testID)}
            placeholder={props.placeholder}
            helper={error ? undefined : props.helper}
            error={error}
            returnKeyType="done"
            onSubmitEditing={add}
            editable={!atMax}
          />
        </View>
        <Button label="Add" onPress={add} disabled={atMax} testID={TestIds.tagInput.add(props.testID)} />
      </View>
      <View style={styles.chips}>
        {props.values.map((value, index) => (
          <Pressable
            key={`${value}-${index}`}
            testID={TestIds.tagInput.chip(props.testID, index)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${value}`}
            onPress={() => remove(index)}
            hitSlop={{ top: chipSlop, bottom: chipSlop, left: chipSlop, right: chipSlop }}
            style={[styles.chip, { borderColor: colors.borderStrong, backgroundColor: colors.surface }]}
          >
            <Text
              maxFontSizeMultiplier={fontScaleCaps.compact}
              style={[styles.chipLabel, { color: colors.textPrimary }]}
            >
              {value}
            </Text>
            <X size={iconSizes.sm} strokeWidth={iconStrokeWidth} color={colors.textSecondary} accessible={false} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  field: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    height: CHIP_HEIGHT,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  chipLabel: {
    ...typography.label,
  },
});
