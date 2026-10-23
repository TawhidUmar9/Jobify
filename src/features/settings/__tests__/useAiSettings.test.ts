import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';

import { AI_DEFAULTS, AI_ERROR_MESSAGES } from '../../../services/ai/types';
import { testConnection } from '../../../services/ai/aiClient';
import { loadAiConfig } from '../../../services/ai/config';
import { API_KEY_STORE_KEY, getApiKey, setApiKey } from '../../../services/secrets';
import { useAiSettings } from '../useAiSettings';

jest.mock('../../../services/ai/aiClient', () => {
  const actual = jest.requireActual('../../../services/ai/aiClient') as typeof import('../../../services/ai/aiClient');
  return { ...actual, testConnection: jest.fn() };
});

describe('useAiSettings', () => {
  beforeEach(async () => {
    await Storage.clear();
    await SecureStore.deleteItemAsync(API_KEY_STORE_KEY);
    jest.mocked(testConnection).mockReset();
  });

  it('loads Gemini defaults and an empty key when nothing is saved', async () => {
    const { result } = await renderHook(() => useAiSettings());
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(result.current.hasSaved).toBe(false);
    expect(result.current.draft).toEqual({ config: AI_DEFAULTS.gemini, apiKey: '' });
    expect(result.current.errors).toEqual({});
    expect(result.current.dirty).toBe(false);
  });

  it('loads a saved config and key', async () => {
    const { saveAiConfig } = jest.requireActual('../../../services/ai/config') as typeof import('../../../services/ai/config');
    await saveAiConfig({ provider: 'openai_compatible', model: 'mock', baseUrl: 'http://10.0.2.2:8787/v1' });
    await setApiKey('k');

    const { result } = await renderHook(() => useAiSettings());
    await waitFor(() => {
      expect(result.current.hasSaved).toBe(true);
    });
    expect(result.current.draft).toEqual({
      config: { provider: 'openai_compatible', model: 'mock', baseUrl: 'http://10.0.2.2:8787/v1' },
      apiKey: 'k',
    });
    expect(result.current.dirty).toBe(false);
  });

  it('shows Connected or the exact error copy from testConnection', async () => {
    const { result } = await renderHook(() => useAiSettings());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      result.current.setDraft({ config: AI_DEFAULTS.gemini, apiKey: 'k' });
    });
    jest.mocked(testConnection).mockResolvedValueOnce({ ok: true, value: true });
    await act(async () => {
      await result.current.test();
    });
    expect(result.current.testState).toEqual({ status: 'ok' });
    expect(jest.mocked(testConnection)).toHaveBeenCalledWith(expect.objectContaining({ kind: 'gemini' }));

    jest.mocked(testConnection).mockResolvedValueOnce({ ok: false, error: { code: 'RATE_LIMITED' } });
    await act(async () => {
      await result.current.test();
    });
    expect(result.current.testState).toEqual({
      status: 'error',
      message: AI_ERROR_MESSAGES.RATE_LIMITED,
    });
  });

  it('rejects an empty model or a non-http base URL and saves a valid draft without requiring a test', async () => {
    const { result } = await renderHook(() => useAiSettings());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      result.current.setDraft({
        config: { provider: 'openai_compatible', model: '  ', baseUrl: 'notaurl' },
        apiKey: 'k',
      });
    });
    let saved = true;
    await act(async () => {
      saved = await result.current.save();
    });
    expect(saved).toBe(false);
    expect(result.current.errors).toEqual({
      model: 'Enter a model name',
      baseUrl: 'Enter a full http(s) address',
    });
    expect(await loadAiConfig()).toBeNull();

    await act(async () => {
      result.current.setDraft({
        config: { provider: 'openai_compatible', model: 'mock', baseUrl: 'http://10.0.2.2:8787/v1/' },
        apiKey: '  k  ',
      });
    });
    expect(result.current.errors).toEqual({});
    await act(async () => {
      saved = await result.current.save();
    });
    expect(saved).toBe(true);
    expect(await loadAiConfig()).toEqual({
      provider: 'openai_compatible',
      model: 'mock',
      baseUrl: 'http://10.0.2.2:8787/v1',
    });
    expect(await getApiKey()).toBe('k');
    expect(result.current.hasSaved).toBe(true);
  });

  it('remove clears the saved config and key', async () => {
    const { result } = await renderHook(() => useAiSettings());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      result.current.setDraft({
        config: { provider: 'gemini', model: 'gemini-3.8-flash', baseUrl: 'https://generativelanguage.googleapis.com' },
        apiKey: 'k',
      });
    });
    await act(async () => {
      await result.current.save();
    });
    await act(async () => {
      await result.current.remove();
    });
    expect(await loadAiConfig()).toBeNull();
    expect(await getApiKey()).toBe('');
    expect(result.current.hasSaved).toBe(false);
    expect(result.current.draft).toEqual({ config: AI_DEFAULTS.gemini, apiKey: '' });
  });

  it('tracks dirty state when draft changes and resets on save', async () => {
    const { result } = await renderHook(() => useAiSettings());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.dirty).toBe(false);

    await act(async () => {
      result.current.setDraft({
        config: AI_DEFAULTS.gemini,
        apiKey: 'new-key',
      });
    });
    expect(result.current.dirty).toBe(true);

    await act(async () => {
      await result.current.save();
    });
    expect(result.current.dirty).toBe(false);
  });
});
