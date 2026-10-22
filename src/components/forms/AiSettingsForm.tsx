import { Text, View } from 'react-native';

import { TestIds } from '../../constants/testIds';
import type { AiConfig } from '../../services/ai/types';

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
  // TODO(T-018): implement per the rules above.
  return (
    <View>
      <Text testID={TestIds.aiForm.testResult}>{props.testState.status}</Text>
    </View>
  );
}
