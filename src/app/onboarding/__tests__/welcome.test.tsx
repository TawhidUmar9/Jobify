import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SnackbarProvider } from '../../../components/ui/Snackbar';
import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { importBackup } from '../../../services/backup';
import OnboardingWelcomeScreen from '../index';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockDb = createFakeDb();
const mockMarkCompleted = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb.db,
}));

jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
}));

jest.mock('../../../features/onboarding/useOnboardingStatus', () => ({
  useOnboardingStatus: () => ({
    completed: false,
    markCompleted: mockMarkCompleted,
  }),
}));

jest.mock('../../../services/backup', () => ({
  importBackup: jest.fn(),
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
        <SnackbarProvider>
          <OnboardingWelcomeScreen />
        </SnackbarProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('OnboardingWelcomeScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockMarkCompleted.mockClear();
    jest.clearAllMocks();
  });

  it('shows the welcome copy and enables restore action', async () => {
    await renderWelcome();
    expect(screen.getByTestId(TestIds.onboarding.welcome)).toBeTruthy();
    expect(screen.getByText('Jobify')).toBeTruthy();
    expect(screen.getByText('Your job search, in one place.')).toBeTruthy();
    expect(screen.getByText('Browse job boards with your logins saved')).toBeTruthy();
    expect(screen.getByText('Check fit, red flags and fill forms with your own AI key')).toBeTruthy();
    expect(screen.getByText('Track every application on this device')).toBeTruthy();
    expect(screen.getByText('No account. No tracking. Your data stays on this phone.')).toBeTruthy();

    const restore = screen.getByTestId(TestIds.onboarding.restoreBackup);
    expect(restore.props.accessibilityState).toEqual({ disabled: false, busy: false });
    expect(restore.props.accessibilityLabel).toBe('Restore from backup');
    expect(screen.queryByText('Available after setup')).toBeNull();
  });

  it('restores backup and marks onboarding completed upon confirmation', async () => {
    jest.mocked(importBackup).mockResolvedValueOnce({
      ok: true,
      value: { resumes: 1, boards: 2, answers: 3, applications: 4 },
    });

    await renderWelcome();
    const restore = screen.getByTestId(TestIds.onboarding.restoreBackup);
    await fireEvent.press(restore);

    expect(screen.getByTestId(TestIds.confirmDialog.dialog)).toBeTruthy();
    expect(screen.getAllByText('Restore from backup').length).toBeGreaterThanOrEqual(2);

    const confirm = screen.getByTestId(TestIds.confirmDialog.confirm);
    await act(async () => {
      await fireEvent.press(confirm);
    });

    await waitFor(() => expect(importBackup).toHaveBeenCalledWith(mockDb.db));
    expect(mockMarkCompleted).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('opens the AI step from Get started', async () => {
    await renderWelcome();
    await fireEvent.press(screen.getByTestId(TestIds.onboarding.start));
    expect(mockPush).toHaveBeenCalledWith('/onboarding/ai');
  });
});
