import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react-native';
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { radii, spacing, touchTarget, typography } from '../../theme/tokens';
import { IconButton } from './IconButton';

export interface TextFieldProps {
  /** Visible label above the field (never placeholder-only). */
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  testID: string;
  placeholder?: string;
  /** Shown below in colors.textSecondary when there is no error. */
  helper?: string;
  /** Shown below in colors.dangerText; also sets accessibilityHint. */
  error?: string | null;
  multiline?: boolean;
  /** Visible lines when multiline (default 4). */
  numberOfLines?: number;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  autoComplete?: 'email' | 'tel' | 'name' | 'url' | 'off';
  maxLength?: number;
  editable?: boolean;
  /** Keyboard return key. TagInput uses "done" to add a chip. */
  returnKeyType?: 'done' | 'next' | 'go' | 'default';
  /** Called when the keyboard return key is pressed. */
  onSubmitEditing?: () => void;
}

/**
 * Labelled text input. UI_DIRECTIVES.md §3 "TextField".
 * - Label typography.label textPrimary, gap 4, input minHeight 48, padding 12, radius md,
 *   1px borderStrong (2px primary when focused, 2px dangerIcon when error), bg surface.
 * - Error text below (typography.caption, dangerText) and announced (accessibilityLiveRegion polite).
 * - secureTextEntry fields get an IconButton Eye/EyeOff to toggle visibility, label "Show key"/"Hide key".
 * - Paste is always allowed (password managers too). accessibilityLabel = label.
 */
export function TextField(props: TextFieldProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const error = props.error ?? '';
  const hasError = error.length > 0;
  const borderColor = hasError ? colors.dangerIcon : focused ? colors.primary : colors.borderStrong;
  const borderWidth = hasError || focused ? 2 : 1;
  const secure = !!props.secureTextEntry && !revealed;
  const lines = props.numberOfLines ?? 4;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{props.label}</Text>
      <View
        style={[
          styles.field,
          props.multiline ? { minHeight: typography.body.lineHeight * lines } : null,
          { backgroundColor: colors.surface, borderColor, borderWidth },
        ]}
      >
        <TextInput
          testID={props.testID}
          accessibilityLabel={props.label}
          accessibilityHint={hasError ? error : undefined}
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={colors.textDisabled}
          multiline={props.multiline}
          numberOfLines={props.multiline ? lines : undefined}
          secureTextEntry={secure}
          keyboardType={props.keyboardType}
          autoCapitalize={props.autoCapitalize}
          autoComplete={props.autoComplete}
          maxLength={props.maxLength}
          editable={props.editable}
          returnKeyType={props.returnKeyType}
          onSubmitEditing={props.onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, { color: colors.textPrimary }]}
          textAlignVertical={props.multiline ? 'top' : 'center'}
        />
        {props.secureTextEntry ? (
          <IconButton
            icon={revealed ? EyeOff : Eye}
            accessibilityLabel={revealed ? 'Hide key' : 'Show key'}
            onPress={() => setRevealed((current) => !current)}
          />
        ) : null}
      </View>
      {hasError ? (
        <Text accessibilityLiveRegion="polite" style={[styles.support, { color: colors.dangerText }]}>
          {error}
        </Text>
      ) : props.helper ? (
        <Text style={[styles.support, { color: colors.textSecondary }]}>{props.helper}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xxs,
  },
  label: {
    ...typography.label,
  },
  field: {
    minHeight: touchTarget.android,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.xxs,
  },
  input: {
    ...typography.body,
    flex: 1,
    minHeight: touchTarget.android,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  support: {
    ...typography.caption,
  },
});
