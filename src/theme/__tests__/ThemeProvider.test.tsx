import { act, renderHook } from '@testing-library/react-native';
import React from 'react';
import { useColorScheme } from 'react-native';

import { resetUiPrefsForTests } from '../../features/settings/useUiPrefs';
import { kvGet, KV_KEYS } from '../../services/kvStore';
import { ThemeProvider, useTheme } from '../ThemeProvider';
import { darkColors, lightColors } from '../tokens';

describe('ThemeProvider mode resolution and preferences', () => {
  beforeEach(() => {
    resetUiPrefsForTests();
    jest.clearAllMocks();
  });

  it('resolves scheme from system color scheme when themeMode is system', async () => {
    const { result } = await renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    expect(result.current.themeMode).toBe('system');
    const expectedScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
    expect(result.current.scheme).toBe(expectedScheme);
    expect(result.current.colors).toEqual(expectedScheme === 'dark' ? darkColors : lightColors);
  });

  it('overrides system scheme when themeMode is dark or light', async () => {
    const { result } = await renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    await act(async () => {
      await result.current.setThemeMode('dark');
    });

    expect(result.current.themeMode).toBe('dark');
    expect(result.current.scheme).toBe('dark');
    expect(result.current.colors).toEqual(darkColors);
    await expect(kvGet(KV_KEYS.themeMode)).resolves.toBe('dark');

    await act(async () => {
      await result.current.setThemeMode('light');
    });
    expect(result.current.themeMode).toBe('light');
    expect(result.current.scheme).toBe('light');
    expect(result.current.colors).toEqual(lightColors);
    await expect(kvGet(KV_KEYS.themeMode)).resolves.toBe('light');
  });

  it('scales typography when textScale changes', async () => {
    const { result } = await renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    expect(result.current.textScale).toBe('system');
    const baseFontSize = result.current.typography.body.fontSize;

    await act(async () => {
      await result.current.setTextScale('1.3');
    });

    expect(result.current.textScale).toBe('1.3');
    expect(result.current.typography.body.fontSize).toBe(Math.round(baseFontSize * 1.3));
    await expect(kvGet(KV_KEYS.textScale)).resolves.toBe('1.3');
  });

  it('updates webZoom and persists to kvStore', async () => {
    const { result } = await renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    expect(result.current.webZoom).toBe(100);

    await act(async () => {
      await result.current.setWebZoom(150);
    });

    expect(result.current.webZoom).toBe(150);
    await expect(kvGet(KV_KEYS.webZoom)).resolves.toBe('150');
  });

  it('updates reduceMotion and overrides system preference', async () => {
    const { result } = await renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => <ThemeProvider>{children}</ThemeProvider>,
    });

    expect(result.current.reduceMotion).toBe('system');

    await act(async () => {
      await result.current.setReduceMotion('on');
    });

    expect(result.current.reduceMotion).toBe('on');
    expect(result.current.isReduceMotion).toBe(true);
    await expect(kvGet(KV_KEYS.reduceMotion)).resolves.toBe('on');

    await act(async () => {
      await result.current.setReduceMotion('off');
    });

    expect(result.current.reduceMotion).toBe('off');
    expect(result.current.isReduceMotion).toBe(false);
    await expect(kvGet(KV_KEYS.reduceMotion)).resolves.toBe('off');
  });
});
