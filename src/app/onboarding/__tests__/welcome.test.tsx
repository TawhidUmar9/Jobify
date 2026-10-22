import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import OnboardingWelcomeScreen from '../index';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  const Icon = (props: Record<string, unknown>) => React.createElement(View, props);
  return { Globe: Icon, Sparkles: Icon, ListChecks: Icon };
});

const safeMetrics = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

function renderWelcome() {
  return render(
    <SafeAreaProvider initialMetrics={safeMetrics}>
      <ThemeProvider>
        <OnboardingWelcomeScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('OnboardingWelcomeScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('shows the welcome copy and a disabled restore action until setup exists', async () => {
    await renderWelcome();
    expect(screen.getByTestId(TestIds.onboarding.welcome)).toBeTruthy();
    expect(screen.getByText('Jobify')).toBeTruthy();
    expect(screen.getByText('Your job search, in one place.')).toBeTruthy();
    expect(screen.getByText('Browse job boards with your logins saved')).toBeTruthy();
    expect(screen.getByText('Check fit, red flags and fill forms with your own AI key')).toBeTruthy();
    expect(screen.getByText('Track every application on this device')).toBeTruthy();
    expect(screen.getByText('No account. No tracking. Your data stays on this phone.')).toBeTruthy();

    const restore = screen.getByTestId(TestIds.onboarding.restoreBackup);
    expect(restore.props.accessibilityState).toEqual({ disabled: true, busy: false });
    expect(restore.props.accessibilityLabel).toBe('Restore from backup');
    expect(screen.getByText('Available after setup')).toBeTruthy();
    fireEvent.press(restore);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('opens the AI step from Get started', async () => {
    await renderWelcome();
    fireEvent.press(screen.getByTestId(TestIds.onboarding.start));
    expect(mockPush).toHaveBeenCalledWith('/onboarding/ai');
  });
});
