import type { AiSettingsDraft } from '../../components/forms/AiSettingsForm';

export interface AiSettingsState {
  status: 'loading' | 'ready';
  draft: AiSettingsDraft;
  setDraft: (draft: AiSettingsDraft) => void;
  testState: { status: 'idle' | 'testing' | 'ok' } | { status: 'error'; message: string };
  /** testConnection(createProvider(draft.config, draft.apiKey)); message from AI_ERROR_MESSAGES. */
  test: () => Promise<void>;
  /** saveAiConfig + setApiKey. Resolves false when the config is invalid (field errors in `errors`). */
  save: () => Promise<boolean>;
  /** clearAiConfig. */
  remove: () => Promise<void>;
  errors: { model?: string; baseUrl?: string };
  /** True when a config was previously saved. */
  hasSaved: boolean;
}

/**
 * Loads the saved config + key (or AI_DEFAULTS.gemini + '') into a draft. Used by onboarding step 2
 * and Settings → AI provider. CONTRACT: ARCHITECTURE.md §7.5.
 * Field errors: model empty → "Enter a model name"; baseUrl not http(s) → "Enter a full http(s) address".
 */
export function useAiSettings(): AiSettingsState {
  // TODO(T-018): implement per the rules above.
  return {
    status: 'loading',
    draft: { config: { provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' }, apiKey: '' },
    setDraft: () => {},
    testState: { status: 'idle' },
    test: async () => {},
    save: async () => false,
    remove: async () => {},
    errors: {},
    hasSaved: false,
  };
}
