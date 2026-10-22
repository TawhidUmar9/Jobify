import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AccessibilityInfo, Platform, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TestIds } from '../../../constants/testIds';
import { motion, touchTarget } from '../../../theme/tokens';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { SnackbarProvider, useSnackbar } from '../Snackbar';
import { StateView } from '../StateView';

const FakeIcon = (() => null) as unknown as LucideIcon;

const safeMetrics = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

function flattenStyle(style: unknown): { minHeight?: number; width?: number; height?: number } {
  const resolved = typeof style === 'function' ? (style as (state: { pressed: boolean }) => unknown)({ pressed: false }) : style;
  const flat = StyleSheet.flatten(resolved as never) as { minHeight?: number; width?: number; height?: number } | undefined;
  return flat ?? {};
}

describe('Button', () => {
  const expectedHeight = Platform.select({
    ios: touchTarget.ios,
    android: touchTarget.android,
    default: touchTarget.android,
  });

  it('uses the platform touch target as its minimum height', async () => {
    await render(<Button label="Save" onPress={jest.fn()} />);
    expect(flattenStyle(screen.getByRole('button').props.style).minHeight).toBe(expectedHeight);
  });

  it('does not call onPress when disabled and exposes accessibilityState', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button').props.accessibilityState).toEqual({ disabled: true, busy: false });
  });

  it('does not call onPress when loading and marks itself busy', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} loading />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button').props.accessibilityState).toEqual({ disabled: false, busy: true });
  });
});

describe('IconButton', () => {
  it('uses a platform hit box and a disabled accessibility state', async () => {
    const onPress = jest.fn();
    await render(<IconButton icon={FakeIcon} accessibilityLabel="Settings" onPress={onPress} disabled />);
    const button = screen.getByRole('button');
    const box = Platform.select({ ios: touchTarget.ios, android: touchTarget.android, default: touchTarget.android });
    const style = flattenStyle(button.props.style);
    expect(style.width).toBe(box);
    expect(style.height).toBe(box);
    expect(button.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('StateView', () => {
  it('announces an error message on mount', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    await render(<StateView kind="error" title="Could not load" message="The local database did not open." />);
    expect(announce).toHaveBeenCalledWith('The local database did not open.');
    announce.mockRestore();
  });
});

describe('Snackbar', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows only the latest message and hides it after 4000 ms', async () => {
    function Probe() {
      const snackbar = useSnackbar();
      return (
        <Button
          label="Show"
          testID="show"
          onPress={() => {
            snackbar.show('a');
            snackbar.show('b');
          }}
        />
      );
    }

    await render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <SnackbarProvider>
          <Probe />
        </SnackbarProvider>
      </SafeAreaProvider>,
    );

    jest.useFakeTimers();
    fireEvent.press(screen.getByTestId('show'));
    await jest.advanceTimersByTimeAsync(0);
    expect(screen.queryByText('a')).toBeNull();
    expect(screen.getByText('b')).toBeTruthy();
    expect(screen.getByTestId(TestIds.snackbarText)).toBeTruthy();

    await jest.advanceTimersByTimeAsync(motion.snackbarVisibleMs);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText('b')).toBeNull();
  });
});
