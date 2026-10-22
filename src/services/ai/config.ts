import { KV_KEYS, kvGet, kvRemove, kvSet } from '../kvStore';
import { deleteApiKey } from '../secrets';
import { AI_DEFAULTS, type AiConfig, type AiProviderKind } from './types';

/**
 * Persistence of the AI provider choice. Non-secret parts in kv-store
 * (KV_KEYS.aiProvider / aiModel / aiBaseUrl); the key via src/services/secrets.ts.
 */

function isHttpBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isProvider(value: string | null): value is AiProviderKind {
  return value === 'gemini' || value === 'openai_compatible';
}

/**
 * Returns the saved config, or null if none was saved (AI not set up / skipped).
 * Unknown provider value → null. Missing model/baseUrl → AI_DEFAULTS[provider] values.
 */
export async function loadAiConfig(): Promise<AiConfig | null> {
  const provider = await kvGet(KV_KEYS.aiProvider);
  if (!isProvider(provider)) return null;
  const defaults = AI_DEFAULTS[provider];
  const model = await kvGet(KV_KEYS.aiModel);
  const baseUrl = await kvGet(KV_KEYS.aiBaseUrl);
  return {
    provider,
    model: model && model.trim() !== '' ? model : defaults.model,
    baseUrl: baseUrl && baseUrl.trim() !== '' ? baseUrl : defaults.baseUrl,
  };
}

/**
 * Validates then saves. Rules: baseUrl must be an http(s) URL (trailing "/" stripped);
 * model trimmed, non-empty. Returns false (nothing saved) when invalid.
 */
export async function saveAiConfig(config: AiConfig): Promise<boolean> {
  const model = config.model.trim();
  const baseUrl = config.baseUrl.trim().replace(/\/+$/, '');
  if (model === '' || !isHttpBaseUrl(baseUrl)) return false;
  await kvSet(KV_KEYS.aiProvider, config.provider);
  await kvSet(KV_KEYS.aiModel, model);
  await kvSet(KV_KEYS.aiBaseUrl, baseUrl);
  return true;
}

/** Removes provider, model, base URL and the API key (Settings → AI provider → "Remove"). */
export async function clearAiConfig(): Promise<void> {
  await kvRemove(KV_KEYS.aiProvider);
  await kvRemove(KV_KEYS.aiModel);
  await kvRemove(KV_KEYS.aiBaseUrl);
  await deleteApiKey();
}
