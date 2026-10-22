import { act, renderHook, waitFor } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';
import type { ReactNode } from 'react';

import { KV_KEYS } from '../../../services/kvStore';
import { OnboardingStatusProvider, useOnboardingStatus } from '../useOnboardingStatus';

function wrapper({ children }: { children: ReactNode }) {
  return <OnboardingStatusProvider>{children}</OnboardingStatusProvider>;
}

describe('OnboardingStatusProvider', () => {
  beforeEach(async () => {
    await Storage.removeItem(KV_KEYS.onboardingCompleted);
  });

  it('stays null until kv is read, then false on a fresh install', async () => {
    let resolveGet: (value: string | null) => void = () => {};
    const getItem = Storage.getItem as jest.MockedFunction<typeof Storage.getItem>;
    getItem.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveGet = resolve;
        }),
    );

    const { result } = await renderHook(() => useOnboardingStatus(), { wrapper });
    expect(result.current.completed).toBeNull();

    await act(async () => {
      resolveGet(null);
    });
    expect(result.current.completed).toBe(false);
  });

  it('reads onboardingCompleted = "1" as completed so the tabs can open', async () => {
    await Storage.setItem(KV_KEYS.onboardingCompleted, '1');
    const { result } = await renderHook(() => useOnboardingStatus(), { wrapper });
    await waitFor(() => {
      expect(result.current.completed).toBe(true);
    });
  });

  it('markCompleted persists "1" and flips completed', async () => {
    const { result } = await renderHook(() => useOnboardingStatus(), { wrapper });
    await waitFor(() => {
      expect(result.current.completed).toBe(false);
    });

    await act(async () => {
      await result.current.markCompleted();
    });

    expect(result.current.completed).toBe(true);
    expect(await Storage.getItem(KV_KEYS.onboardingCompleted)).toBe('1');
  });
});
