import { useState } from 'react';
import { CircleCheck } from 'lucide-react-native';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { aiSettingsFieldErrors } from '../../features/settings/useAiSettings';
import { AI_DEFAULTS, type AiConfig, type AiProviderKind } from '../../services/ai/types';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, iconSizes, iconStrokeWidth, spacing, touchTarget, typography } from '../../theme/tokens';
import { Button } from '../ui/Button';
import { SegmentedControl } from '../ui/SegmentedControl';
import { TextField } from '../ui/TextField';
import { ToggleRow } from '../ui/ToggleRow';

export interface AiSettingsDraft {
  config: AiConfig;
  apiKey: string;
}

export interface AiSettingsFormProps {
  draft: AiSettingsDraft;
  onChange: (draft: AiSettingsDraft) => void;
  /** Runs testConnection with the draft; result shown inline. */
  onTest: () => void;
  testState: { status: 'idle' | 'testing' | 'ok' } | { status: 'error'; message: string };
}

const GEMINI_KEY_URL = 'https://aistudio.google.com/apikey';

const linkMinHeight = Platform.select({
  ios: touchTarget.ios,
  android: touchTarget.android,
  default: touchTarget.android,
});

/**
 * AI provider form. UI_DIRECTIVES.md §4.2. Fields, in order:
 * 1. SegmentedControl "Provider": Gemini (TestIds.aiForm.providerGemini) | OpenAI-compatible
 *    (providerOpenAi). Switching provider resets model/baseUrl to AI_DEFAULTS[provider], keeps the key.
 * 2. TextField "API key" (TestIds.aiForm.apiKey), secureTextEntry, autoCapitalize none.
 *    Helper for Gemini: "Free keys: aistudio.google.com/apikey" + link button (getKeyLink) opening
 *    https://aistudio.google.com/apikey with Linking.openURL. For OpenAI-compatible: "Optional for local servers".
 * 3. TextField "Model" (TestIds.aiForm.model). Gemini placeholder "gemini-3.8-flash"; OpenAI-compatible
 *    placeholder "e.g. gpt-5-mini, llama3.1" and required.
 * 4. Gemini: "Advanced" toggle (advancedToggle) reveals Base URL. OpenAI-compatible: Base URL always shown
 *    (TestIds.aiForm.baseUrl), keyboardType url, helper "e.g. https://api.openai.com/v1 or http://192.168.1.5:11434/v1".
 * 5. Button "Test connection" (test) + result line (testResult): "Connected" (successText + CircleCheck)
 *    or the error message (dangerText).
 * 6. Privacy note (caption): "Your key is stored only on this device in the system keystore. Job pages
 *    and your profile are sent to the provider you choose when you tap Analyze."
 */
export function AiSettingsForm(props: AiSettingsFormProps) {
  const { colors } = useTheme();
  const [advanced, setAdvanced] = useState(false);
  const provider = props.draft.config.provider;
  const fieldErrors = aiSettingsFieldErrors(props.draft);
  const showBaseUrl = provider === 'openai_compatible' || advanced || fieldErrors.baseUrl !== undefined;

  function updateConfig(patch: Partial<AiConfig>) {
    props.onChange({ ...props.draft, config: { ...props.draft.config, ...patch } });
  }

  function selectProvider(next: AiProviderKind) {
    if (next === provider) return;
    const defaults = AI_DEFAULTS[next];
    setAdvanced(false);
    props.onChange({
      apiKey: props.draft.apiKey,
      config: { provider: next, model: defaults.model, baseUrl: defaults.baseUrl },
    });
  }

  const resultColor = props.testState.status === 'ok' ? colors.successText : colors.dangerText;
  const resultText = props.testState.status === 'ok' ? 'Connected' : props.testState.status === 'error' ? props.testState.message : '';

  return (
    <View style={styles.form}>
      <SegmentedControl
        label="Provider"
        options={[
          { value: 'gemini', label: 'Gemini', testID: TestIds.aiForm.providerGemini },
          { value: 'openai_compatible', label: 'OpenAI-compatible', testID: TestIds.aiForm.providerOpenAi },
        ]}
        selected={[provider]}
        onChange={(selected) => {
          const next = selected[0];
          if (next) selectProvider(next);
        }}
      />
      <View style={styles.field}>
        <TextField
          label="API key"
          value={props.draft.apiKey}
          onChangeText={(apiKey) => props.onChange({ ...props.draft, apiKey })}
          testID={TestIds.aiForm.apiKey}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="off"
          helper={provider === 'openai_compatible' ? 'Optional for local servers' : undefined}
        />
        {provider === 'gemini' ? (
          <Pressable
            testID={TestIds.aiForm.getKeyLink}
            accessibilityRole="link"
            accessibilityLabel="Free keys: aistudio.google.com/apikey"
            onPress={() => {
              void Linking.openURL(GEMINI_KEY_URL);
            }}
            style={styles.link}
          >
            <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.helper, { color: colors.primary }]}>
              Free keys: aistudio.google.com/apikey
            </Text>
          </Pressable>
        ) : null}
      </View>
      <TextField
        label="Model"
        value={props.draft.config.model}
        onChangeText={(model) => updateConfig({ model })}
        testID={TestIds.aiForm.model}
        autoCapitalize="none"
        placeholder={provider === 'gemini' ? 'gemini-3.8-flash' : 'e.g. gpt-5-mini, llama3.1'}
        error={fieldErrors.model}
      />
      {provider === 'gemini' ? (
        <ToggleRow label="Advanced" value={advanced} onValueChange={setAdvanced} testID={TestIds.aiForm.advancedToggle} />
      ) : null}
      {showBaseUrl ? (
        <TextField
          label="Base URL"
          value={props.draft.config.baseUrl}
          onChangeText={(baseUrl) => updateConfig({ baseUrl })}
          testID={TestIds.aiForm.baseUrl}
          keyboardType="url"
          autoCapitalize="none"
          autoComplete="url"
          helper="e.g. https://api.openai.com/v1 or http://192.168.1.5:11434/v1"
          error={fieldErrors.baseUrl}
        />
      ) : null}
      <Button
        label="Test connection"
        variant="secondary"
        testID={TestIds.aiForm.test}
        accessibilityLabel="Test connection"
        loading={props.testState.status === 'testing'}
        onPress={props.onTest}
      />
      {props.testState.status === 'ok' || props.testState.status === 'error' ? (
        <View style={styles.result} testID={TestIds.aiForm.testResult}>
          {props.testState.status === 'ok' ? (
            <CircleCheck
              size={iconSizes.md}
              strokeWidth={iconStrokeWidth}
              color={colors.successIcon}
              accessible={false}
              importantForAccessibility="no"
            />
          ) : null}
          <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.resultText, { color: resultColor }]}>
            {resultText}
          </Text>
        </View>
      ) : (
        <Text testID={TestIds.aiForm.testResult} style={styles.hiddenResult}>
          {''}
        </Text>
      )}
      <Text maxFontSizeMultiplier={fontScaleCaps.default} style={[styles.privacy, { color: colors.textSecondary }]}>
        Your key is stored only on this device in the system keystore. Job pages and your profile are sent to the provider you choose when you tap Analyze.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xxs,
  },
  link: {
    minHeight: linkMinHeight,
    justifyContent: 'center',
  },
  helper: {
    ...typography.caption,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  resultText: {
    ...typography.body,
    flex: 1,
  },
  hiddenResult: {
    height: 0,
  },
  privacy: {
    ...typography.caption,
  },
});
