import { Check } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import {
  useUiPrefs,
  VALID_WEB_ZOOMS,
  type ReduceMotionMode,
  type ThemeMode,
} from '../../features/settings/useUiPrefs';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, iconSizes, iconStrokeWidth, radii, spacing, touchTarget, typography, type TextScale } from '../../theme/tokens';

interface RadioOption<T> {
  value: T;
  label: string;
  testID: string;
}

const THEME_OPTIONS: RadioOption<ThemeMode>[] = [
  { value: 'system', label: 'System', testID: TestIds.appearance.theme('system') },
  { value: 'light', label: 'Light', testID: TestIds.appearance.theme('light') },
  { value: 'dark', label: 'Dark', testID: TestIds.appearance.theme('dark') },
];

const TEXT_SCALE_OPTIONS: RadioOption<TextScale>[] = [
  { value: 'system', label: 'System', testID: TestIds.appearance.textScale('system') },
  { value: '0.9', label: '90%', testID: TestIds.appearance.textScale('0.9') },
  { value: '1', label: '100%', testID: TestIds.appearance.textScale('1') },
  { value: '1.15', label: '115%', testID: TestIds.appearance.textScale('1.15') },
  { value: '1.3', label: '130%', testID: TestIds.appearance.textScale('1.3') },
];

const WEB_ZOOM_OPTIONS: RadioOption<number>[] = VALID_WEB_ZOOMS.map((zoom) => ({
  value: zoom,
  label: `${zoom}%`,
  testID: TestIds.appearance.webZoom(zoom),
}));

const REDUCE_MOTION_OPTIONS: RadioOption<ReduceMotionMode>[] = [
  { value: 'system', label: 'System', testID: TestIds.appearance.reduceMotion('system') },
  { value: 'on', label: 'On', testID: TestIds.appearance.reduceMotion('on') },
  { value: 'off', label: 'Off', testID: TestIds.appearance.reduceMotion('off') },
];

/**
 * Settings → Appearance & accessibility.
 * In-app theme, text scale, web page zoom, and motion preferences.
 */
export default function AppearanceScreen() {
  const { colors } = useTheme();
  const {
    themeMode,
    setThemeMode,
    textScale,
    setTextScale,
    webZoom,
    setWebZoom,
    reduceMotion,
    setReduceMotion,
  } = useUiPrefs();

  function renderRadioGroup<T>(
    title: string,
    options: RadioOption<T>[],
    currentValue: T,
    onSelect: (value: T) => void,
  ) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text
          maxFontSizeMultiplier={fontScaleCaps.default}
          style={[styles.sectionTitle, { color: colors.textPrimary }]}
        >
          {title}
        </Text>
        <View style={styles.groupContainer}>
          {options.map((option, index) => {
            const isChecked = option.value === currentValue;
            const isLast = index === options.length - 1;
            return (
              <Pressable
                key={option.testID}
                testID={option.testID}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ checked: isChecked }}
                style={[
                  styles.radioRow,
                  !isLast && [styles.radioRowBorder, { borderBottomColor: colors.border }],
                ]}
                onPress={() => onSelect(option.value)}
              >
                <Text
                  maxFontSizeMultiplier={fontScaleCaps.default}
                  style={[styles.radioLabel, { color: colors.textPrimary }]}
                >
                  {option.label}
                </Text>
                {isChecked ? (
                  <Check
                    size={iconSizes.md}
                    strokeWidth={iconStrokeWidth}
                    color={colors.primary}
                    accessible={false}
                    importantForAccessibility="no"
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      testID={TestIds.appearance.screen}
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {renderRadioGroup('Theme', THEME_OPTIONS, themeMode, (val) => {
        void setThemeMode(val);
      })}
      {renderRadioGroup('Text size', TEXT_SCALE_OPTIONS, textScale, (val) => {
        void setTextScale(val);
      })}
      {renderRadioGroup('Web page zoom', WEB_ZOOM_OPTIONS, webZoom, (val) => {
        void setWebZoom(val);
      })}
      {renderRadioGroup('Reduce motion', REDUCE_MOTION_OPTIONS, reduceMotion, (val) => {
        void setReduceMotion(val);
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.headline,
  },
  groupContainer: {
    overflow: 'hidden',
  },
  radioRow: {
    minHeight: touchTarget.android,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  radioRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  radioLabel: {
    ...typography.body,
  },
});
