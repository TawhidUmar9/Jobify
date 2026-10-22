import { Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

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
  // TODO(T-003): implement per the rules above.
  return (
    <View>
      <Text>{props.label}</Text>
      <TextInput
        testID={props.testID}
        accessibilityLabel={props.label}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        multiline={props.multiline}
        secureTextEntry={props.secureTextEntry}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize}
        maxLength={props.maxLength}
        editable={props.editable}
      />
      {props.error ? <Text>{props.error}</Text> : null}
    </View>
  );
}
