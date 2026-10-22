/**
 * The API key, stored only in expo-secure-store (Android Keystore / iOS Keychain).
 * CONTRACT: never in SQLite, kv-store, logs, backups, or the JS bundle.
 */

export const API_KEY_STORE_KEY = 'jobify.ai.apiKey';

/** Returns the key or '' when unset or unreadable (log logger.warn without the value). */
export async function getApiKey(): Promise<string> {
  // TODO(T-005): implement with SecureStore.getItemAsync.
  return '';
}

/** Saves a trimmed key; an empty string deletes it. Resolves false on failure. */
export async function setApiKey(key: string): Promise<boolean> {
  // TODO(T-005): implement with SecureStore.setItemAsync / deleteItemAsync.
  void key;
  return false;
}

export async function deleteApiKey(): Promise<void> {
  // TODO(T-005): implement.
}
