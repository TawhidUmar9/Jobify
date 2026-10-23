import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { TestIds } from '../../../constants/testIds';
import { resetUiPrefsForTests } from '../../../features/settings/useUiPrefs';
import { kvGet, KV_KEYS } from '../../../services/kvStore';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import AppearanceScreen from '../appearance';

describe('AppearanceScreen', () => {
  beforeEach(() => {
    resetUiPrefsForTests();
    jest.clearAllMocks();
  });

  async function renderScreen() {
    return await render(
      <ThemeProvider>
        <AppearanceScreen />
      </ThemeProvider>,
    );
  }

  it('renders the screen and all options with radio accessibility roles', async () => {
    await renderScreen();

    expect(screen.getByTestId(TestIds.appearance.screen)).toBeTruthy();

    // Theme options
    expect(screen.getByTestId(TestIds.appearance.theme('system')).props.accessibilityRole).toBe('radio');
    expect(screen.getByTestId(TestIds.appearance.theme('system')).props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId(TestIds.appearance.theme('light')).props.accessibilityRole).toBe('radio');
    expect(screen.getByTestId(TestIds.appearance.theme('light')).props.accessibilityState.checked).toBe(false);
    expect(screen.getByTestId(TestIds.appearance.theme('dark')).props.accessibilityRole).toBe('radio');
    expect(screen.getByTestId(TestIds.appearance.theme('dark')).props.accessibilityState.checked).toBe(false);

    // Text scale options
    expect(screen.getByTestId(TestIds.appearance.textScale('system')).props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId(TestIds.appearance.textScale('1.15')).props.accessibilityState.checked).toBe(false);

    // Web zoom options
    expect(screen.getByTestId(TestIds.appearance.webZoom(100)).props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId(TestIds.appearance.webZoom(150)).props.accessibilityState.checked).toBe(false);

    // Reduce motion options
    expect(screen.getByTestId(TestIds.appearance.reduceMotion('system')).props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId(TestIds.appearance.reduceMotion('on')).props.accessibilityState.checked).toBe(false);
  });

  it('updates theme mode live and persists to kvStore', async () => {
    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId(TestIds.appearance.theme('dark')));
    });

    expect(screen.getByTestId(TestIds.appearance.theme('dark')).props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId(TestIds.appearance.theme('system')).props.accessibilityState.checked).toBe(false);
    await expect(kvGet(KV_KEYS.themeMode)).resolves.toBe('dark');

    await act(async () => {
      fireEvent.press(screen.getByTestId(TestIds.appearance.theme('light')));
    });

    expect(screen.getByTestId(TestIds.appearance.theme('light')).props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId(TestIds.appearance.theme('dark')).props.accessibilityState.checked).toBe(false);
    await expect(kvGet(KV_KEYS.themeMode)).resolves.toBe('light');
  });

  it('updates text scale live and persists to kvStore', async () => {
    await renderScreen();

    const scales = ['0.9', '1', '1.15', '1.3', 'system'] as const;
    for (const scale of scales) {
      await act(async () => {
        fireEvent.press(screen.getByTestId(TestIds.appearance.textScale(scale)));
      });

      expect(screen.getByTestId(TestIds.appearance.textScale(scale)).props.accessibilityState.checked).toBe(true);
      await expect(kvGet(KV_KEYS.textScale)).resolves.toBe(scale);
    }
  });

  it('updates web zoom live and persists to kvStore', async () => {
    await renderScreen();

    const zooms = [75, 90, 100, 115, 130, 150, 175, 200];
    for (const zoom of zooms) {
      await act(async () => {
        fireEvent.press(screen.getByTestId(TestIds.appearance.webZoom(zoom)));
      });

      expect(screen.getByTestId(TestIds.appearance.webZoom(zoom)).props.accessibilityState.checked).toBe(true);
      await expect(kvGet(KV_KEYS.webZoom)).resolves.toBe(String(zoom));
    }
  });

  it('updates reduce motion live and persists to kvStore', async () => {
    await renderScreen();

    await act(async () => {
      fireEvent.press(screen.getByTestId(TestIds.appearance.reduceMotion('on')));
    });

    expect(screen.getByTestId(TestIds.appearance.reduceMotion('on')).props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId(TestIds.appearance.reduceMotion('system')).props.accessibilityState.checked).toBe(false);
    await expect(kvGet(KV_KEYS.reduceMotion)).resolves.toBe('on');

    await act(async () => {
      fireEvent.press(screen.getByTestId(TestIds.appearance.reduceMotion('off')));
    });

    expect(screen.getByTestId(TestIds.appearance.reduceMotion('off')).props.accessibilityState.checked).toBe(true);
    expect(screen.getByTestId(TestIds.appearance.reduceMotion('on')).props.accessibilityState.checked).toBe(false);
    await expect(kvGet(KV_KEYS.reduceMotion)).resolves.toBe('off');
  });
});
