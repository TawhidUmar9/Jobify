import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';

import { logger } from '../../lib/logger';
import { AI_DEFAULTS } from '../ai/types';
import { clearAiConfig, loadAiConfig, saveAiConfig } from '../ai/config';
import { KV_KEYS, kvGet, kvRemove, kvSet } from '../kvStore';
import { API_KEY_STORE_KEY, getApiKey, setApiKey } from '../secrets';

describe('kv-store', () => {
  it('round-trips a value and returns null when missing', async () => {
    await kvRemove(KV_KEYS.activeBoardId);
    expect(await kvGet(KV_KEYS.activeBoardId)).toBeNull();
    await kvSet(KV_KEYS.activeBoardId, '4');
    expect(await kvGet(KV_KEYS.activeBoardId)).toBe('4');
  });

  it('swallows store errors and logs the key only', async () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(Storage, 'getItem').mockRejectedValueOnce(new Error('disk secret-value'));
    await expect(kvGet(KV_KEYS.aiModel)).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith('kvStore', KV_KEYS.aiModel);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret-value');
    warn.mockRestore();
  });
});

describe('secrets', () => {
  const secret = 'super-secret-key';

  afterEach(async () => {
    await SecureStore.deleteItemAsync(API_KEY_STORE_KEY);
  });

  it('trims a saved key, deletes on empty, and never throws', async () => {
    expect(await setApiKey(`  ${secret}  `)).toBe(true);
    expect(await getApiKey()).toBe(secret);
    expect(await setApiKey('')).toBe(true);
    expect(await getApiKey()).toBe('');

    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    jest.spyOn(SecureStore, 'getItemAsync').mockRejectedValueOnce(new Error(`boom ${secret}`));
    await expect(getApiKey()).resolves.toBe('');
    expect(JSON.stringify(warn.mock.calls)).not.toContain(secret);
    warn.mockRestore();
  });

  it('never logs the API key value', async () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(logger, 'error').mockImplementation(() => {});
    jest.spyOn(SecureStore, 'setItemAsync').mockRejectedValueOnce(new Error(`rejected ${secret}`));
    expect(await setApiKey(secret)).toBe(false);
    jest.spyOn(SecureStore, 'getItemAsync').mockRejectedValueOnce(new Error(`unreadable ${secret}`));
    await getApiKey();
    const logged = JSON.stringify([...warn.mock.calls, ...error.mock.calls]);
    expect(logged).not.toContain(secret);
    expect(warn).toHaveBeenCalledWith('secrets', API_KEY_STORE_KEY);
    warn.mockRestore();
    error.mockRestore();
  });
});

describe('AI config', () => {
  afterEach(async () => {
    await clearAiConfig();
  });

  it('rejects a non-http base URL or an empty model and saves nothing', async () => {
    expect(await saveAiConfig({ provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://ok.example/v1/' })).toBe(
      true,
    );
    expect(await loadAiConfig()).toEqual({
      provider: 'gemini',
      model: 'gemini-3.8-flash',
      baseUrl: 'https://ok.example/v1',
    });

    expect(await saveAiConfig({ provider: 'openai_compatible', model: 'mock', baseUrl: 'ftp://files.example' })).toBe(
      false,
    );
    expect(await saveAiConfig({ provider: 'openai_compatible', model: '   ', baseUrl: 'https://api.openai.com/v1' })).toBe(
      false,
    );
    expect(await loadAiConfig()).toEqual({
      provider: 'gemini',
      model: 'gemini-3.8-flash',
      baseUrl: 'https://ok.example/v1',
    });
  });

  it('returns null for an unknown provider and fills defaults', async () => {
    await kvSet(KV_KEYS.aiProvider, 'nope');
    expect(await loadAiConfig()).toBeNull();

    await kvSet(KV_KEYS.aiProvider, 'gemini');
    await kvRemove(KV_KEYS.aiModel);
    await kvRemove(KV_KEYS.aiBaseUrl);
    expect(await loadAiConfig()).toEqual(AI_DEFAULTS.gemini);
  });

  it('clears the three kv keys and the API key', async () => {
    expect(
      await saveAiConfig({ provider: 'openai_compatible', model: 'mock', baseUrl: 'https://api.openai.com/v1/' }),
    ).toBe(true);
    await setApiKey('k');
    await clearAiConfig();
    expect(await loadAiConfig()).toBeNull();
    expect(await kvGet(KV_KEYS.aiModel)).toBeNull();
    expect(await kvGet(KV_KEYS.aiBaseUrl)).toBeNull();
    expect(await getApiKey()).toBe('');
  });
});
