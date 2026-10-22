import Storage from 'expo-sqlite/kv-store';

import { logger } from '../lib/logger';

/**
 * Typed key-value settings backed by expo-sqlite/kv-store. CONTRACT FILE for the key list.
 * Secrets never go here (src/services/secrets.ts).
 */

export const KV_KEYS = {
  /** "1" once onboarding finished (or was completed via backup import). */
  onboardingCompleted: 'jobify.onboardingCompleted',
  /** AiProviderKind. */
  aiProvider: 'jobify.ai.provider',
  aiModel: 'jobify.ai.model',
  aiBaseUrl: 'jobify.ai.baseUrl',
  /** JobBoard.id (decimal string) selected in Workspace. */
  activeBoardId: 'jobify.activeBoardId',
  /** Android SAF tree URI of the resume staging folder (e.g. Download/Jobify). */
  androidStagingDirUri: 'jobify.android.stagingDirUri',
  /** "1" once the user has seen the Android staging explainer. */
  stagingExplainerSeen: 'jobify.stagingExplainerSeen',
} as const;

export type KvKey = (typeof KV_KEYS)[keyof typeof KV_KEYS];

/**
 * Reads a value. Resolves null when missing or when the store throws (logger.warn with the key only).
 * Implementation: `import Storage from 'expo-sqlite/kv-store'; Storage.getItem(key)`.
 */
export async function kvGet(key: KvKey): Promise<string | null> {
  try {
    return await Storage.getItem(key);
  } catch {
    logger.warn('kvStore', key);
    return null;
  }
}

/** Writes a value. Swallows and logs errors. */
export async function kvSet(key: KvKey, value: string): Promise<void> {
  try {
    await Storage.setItem(key, value);
  } catch {
    logger.warn('kvStore', key);
  }
}

/** Removes a value. Swallows and logs errors. */
export async function kvRemove(key: KvKey): Promise<void> {
  try {
    await Storage.removeItem(key);
  } catch {
    logger.warn('kvStore', key);
  }
}
