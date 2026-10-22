import type { AiConfig } from './types';

/**
 * Persistence of the AI provider choice. Non-secret parts in kv-store
 * (KV_KEYS.aiProvider / aiModel / aiBaseUrl); the key via src/services/secrets.ts.
 */

/**
 * Returns the saved config, or null if none was saved (AI not set up / skipped).
 * Unknown provider value → null. Missing model/baseUrl → AI_DEFAULTS[provider] values.
 */
export async function loadAiConfig(): Promise<AiConfig | null> {
  // TODO(T-005): implement with kvGet.
  return null;
}

/**
 * Validates then saves. Rules: baseUrl must be an http(s) URL (trailing "/" stripped);
 * model trimmed, non-empty. Returns false (nothing saved) when invalid.
 */
export async function saveAiConfig(config: AiConfig): Promise<boolean> {
  // TODO(T-005): implement with kvSet.
  void config;
  return false;
}

/** Removes provider, model, base URL and the API key (Settings → AI provider → "Remove"). */
export async function clearAiConfig(): Promise<void> {
  // TODO(T-005): implement (kvRemove ×3 + deleteApiKey).
}
