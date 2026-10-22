import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TestIds } from '../../../constants/testIds';
import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import OnboardingProfileScreen from '../profile';

const mockPush = jest.fn();
const mockDb = createFakeDb();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb.db,
}));

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  const Icon = (props: Record<string, unknown>) => React.createElement(View, props);
  return { Eye: Icon, EyeOff: Icon, X: Icon, CircleCheck: Icon };
});

const safeMetrics = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

describe('OnboardingProfileScreen', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockDb.calls.length = 0;
  });

  it('hides PDF and paste when AI is skipped, and blocks Continue until the profile is valid', async () => {
    await render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <ThemeProvider>
          <OnboardingProfileScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(await screen.findByText('Add your resume')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByTestId(TestIds.onboarding.next).props.accessibilityState.disabled).toBe(false);
    });
    expect(screen.getByText('PDF import needs Gemini')).toBeTruthy();
    expect(screen.queryByTestId(TestIds.resumeImport.importPdf)).toBeNull();
    expect(screen.queryByTestId(TestIds.resumeImport.pasteToggle)).toBeNull();
    expect(screen.getByTestId(TestIds.resumeImport.label).props.value).toBe('Main');

    await fireEvent.press(screen.getByTestId(TestIds.onboarding.next));
    expect(await screen.findByText('Enter your name')).toBeTruthy();
    expect(screen.getByText('Enter a valid email')).toBeTruthy();
    expect(screen.getByDisplayValue('Asia/Dhaka')).toBeTruthy();
    expect(screen.getByDisplayValue('BD')).toBeTruthy();
    expect(mockPush).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId(TestIds.profileForm.fullName), 'Alex Rahman');
    await fireEvent.changeText(screen.getByTestId(TestIds.profileForm.email), 'alex.rahman@example.com');
    await fireEvent.press(screen.getByTestId(TestIds.onboarding.next));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/onboarding/preferences');
    });
    expect(mockDb.calls.some((call) => call.sql.includes('INSERT INTO profile'))).toBe(true);
  });
});
