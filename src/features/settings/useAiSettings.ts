import { useCallback, useEffect, useState } from 'react';

import type { AiSettingsDraft } from '../../components/forms/AiSettingsForm';
import { isHttpUrl } from '../../lib/url';
import { createProvider, testConnection } from '../../services/ai/aiClient';
import { clearAiConfig, loadAiConfig, saveAiConfig } from '../../services/ai/config';
import { AI_DEFAULTS, AI_ERROR_MESSAGES } from '../../services/ai/types';
import { getApiKey, setApiKey } from '../../services/secrets';

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
  /** True when the draft differs from the saved config or the API key was edited. */
  dirty: boolean;
}

const EMPTY_DRAFT: AiSettingsDraft = { config: AI_DEFAULTS.gemini, apiKey: '' };

/** Field errors: empty model, or a base URL that is not http(s). */
export function aiSettingsFieldErrors(draft: AiSettingsDraft): { model?: string; baseUrl?: string } {
  const errors: { model?: string; baseUrl?: string } = {};
  if (draft.config.model.trim() === '') errors.model = 'Enter a model name';
  if (!isHttpUrl(draft.config.baseUrl.trim())) errors.baseUrl = 'Enter a full http(s) address';
  return errors;
}

/**
 * Loads the saved config + key (or AI_DEFAULTS.gemini + '') into a draft. Used by onboarding step 2
 * and Settings → AI provider. CONTRACT: ARCHITECTURE.md §7.5.
 * Field errors: model empty → "Enter a model name"; baseUrl not http(s) → "Enter a full http(s) address".
 */
export function useAiSettings(): AiSettingsState {
  const [status, setStatus] = useState<'loading' | 'ready'>('loading');
  const [draft, setDraftState] = useState<AiSettingsDraft>(EMPTY_DRAFT);
  const [savedDraft, setSavedDraft] = useState<AiSettingsDraft | null>(null);
  const [testState, setTestState] = useState<AiSettingsState['testState']>({ status: 'idle' });
  const [showErrors, setShowErrors] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const config = await loadAiConfig();
      const apiKey = await getApiKey();
      if (cancelled) return;
      const initial = { config: config ?? AI_DEFAULTS.gemini, apiKey };
      setHasSaved(config !== null);
      setDraftState(initial);
      setSavedDraft(initial);
      setStatus('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setDraft = useCallback((next: AiSettingsDraft) => {
    setDraftState(next);
  }, []);

  const test = useCallback(async () => {
    setTestState({ status: 'testing' });
    const result = await testConnection(createProvider(draft.config, draft.apiKey));
    if (result.ok) {
      setTestState({ status: 'ok' });
      return;
    }
    setTestState({ status: 'error', message: AI_ERROR_MESSAGES[result.error.code] });
  }, [draft]);

  const save = useCallback(async () => {
    setShowErrors(true);
    const nextErrors = aiSettingsFieldErrors(draft);
    if (nextErrors.model !== undefined || nextErrors.baseUrl !== undefined) return false;
    const saved = await saveAiConfig(draft.config);
    if (!saved) return false;
    const keySaved = await setApiKey(draft.apiKey);
    if (!keySaved) return false;
    setSavedDraft(draft);
    setHasSaved(true);
    return true;
  }, [draft]);

  const remove = useCallback(async () => {
    await clearAiConfig();
    setDraftState(EMPTY_DRAFT);
    setSavedDraft(EMPTY_DRAFT);
    setHasSaved(false);
    setShowErrors(false);
    setTestState({ status: 'idle' });
  }, []);

  const dirty =
    savedDraft !== null &&
    (JSON.stringify(draft.config) !== JSON.stringify(savedDraft.config) || draft.apiKey !== savedDraft.apiKey);

  return {
    status,
    draft,
    setDraft,
    testState,
    test,
    save,
    remove,
    errors: showErrors ? aiSettingsFieldErrors(draft) : {},
    hasSaved,
    dirty,
  };
}
