import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, radii, spacing, typography } from '../../theme/tokens';

export interface SkillChipsProps {
  title: 'Matched skills' | 'Missing skills';
  skills: string[];
  testID: string;
}

/** Chip height from UI_DIRECTIVES §4.4. */
const CHIP_HEIGHT = 28;

/**
 * Non-interactive wrapped chips (height 28, outlined borderStrong, caption). Empty → nothing.
 * Container accessibilityLabel `${title}: ${skills.join(', ')}`.
 */
export function SkillChips({ title, skills, testID }: SkillChipsProps) {
  const { colors } = useTheme();
  if (skills.length === 0) return null;
  return (
    <View testID={testID} accessible accessibilityRole="text" accessibilityLabel={`${title}: ${skills.join(', ')}`} style={styles.wrap}>
      <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      <View style={styles.row}>
        {skills.map((skill) => (
          <View key={skill} style={[styles.chip, { borderColor: colors.borderStrong }]}>
            <Text maxFontSizeMultiplier={fontScaleCaps.compact} style={[styles.chipText, { color: colors.textPrimary }]}>{skill}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  title: {
    ...typography.label,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    height: CHIP_HEIGHT,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  chipText: {
    ...typography.caption,
  },
});
