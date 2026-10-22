import * as SecureStore from 'expo-secure-store';

import { logger } from '../lib/logger';

/**
 * The API key, stored only in expo-secure-store (Android Keystore / iOS Keychain).
 * CONTRACT: never in SQLite, kv-store, logs, backups, or the JS bundle.
 */

export const API_KEY_STORE_KEY = 'jobify.ai.apiKey';

/** Returns the key or '' when unset or unreadable (log logger.warn without the value). */
export async function getApiKey(): Promise<string> {
  try {
    const value = await SecureStore.getItemAsync(API_KEY_STORE_KEY);
    return value ?? '';
  } catch {
    logger.warn('secrets', API_KEY_STORE_KEY);
    return '';
  }
}

/** Saves a trimmed key; an empty string deletes it. Resolves false on failure. */
export async function setApiKey(key: string): Promise<boolean> {
  const trimmed = key.trim();
  try {
    if (trimmed === '') {
      await SecureStore.deleteItemAsync(API_KEY_STORE_KEY);
    } else {
      await SecureStore.setItemAsync(API_KEY_STORE_KEY, trimmed);
    }
    return true;
  } catch {
    logger.warn('secrets', API_KEY_STORE_KEY);
    return false;
  }
}

export async function deleteApiKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(API_KEY_STORE_KEY);
  } catch {
    logger.warn('secrets', API_KEY_STORE_KEY);
  }
}
