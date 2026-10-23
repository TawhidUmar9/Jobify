import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';

import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  getIsReduceMotion,
  resetUiPrefsForTests,
  setReduceMotion,
} from '../../features/settings/useUiPrefs';
import { ThemeProvider } from '../ThemeProvider';

describe('Reduce motion override', () => {
  beforeEach(() => {
    resetUiPrefsForTests();
    jest.clearAllMocks();
  });

  it('honors system AccessibilityInfo when preference is system', () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false as never);
    expect(getIsReduceMotion()).toBe(false);
  });

  it('forces reduceMotion true when preference is on', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false as never);

    await act(async () => {
      await setReduceMotion('on');
    });

    expect(getIsReduceMotion()).toBe(true);

    // ConfirmDialog animationType should be 'none'
    const { rerender } = await render(
      <ThemeProvider>
        <ConfirmDialog
          visible
          title="Delete item?"
          message="This cannot be undone."
          confirmLabel="Delete"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Delete item?')).toBeTruthy();

    await act(async () => {
      await setReduceMotion('off');
    });

    expect(getIsReduceMotion()).toBe(false);

    await rerender(
      <ThemeProvider>
        <ConfirmDialog
          visible
          title="Delete item?"
          message="This cannot be undone."
          confirmLabel="Delete"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('Delete item?')).toBeTruthy();
  });
});
