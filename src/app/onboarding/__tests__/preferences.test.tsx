import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import Storage from 'expo-sqlite/kv-store';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TestIds } from '../../../constants/testIds';
import { OnboardingStatusProvider } from '../../../features/onboarding/useOnboardingStatus';
import { KV_KEYS } from '../../../services/kvStore';
import { createFakeDb } from '../../../../tests/helpers/fakeDb';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import OnboardingPreferencesScreen from '../preferences';

const mockDb = createFakeDb();

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => mockDb.db,
}));

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  const Icon = (props: Record<string, unknown>) => React.createElement(View, props);
  return { X: Icon };
});

const safeMetrics = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

describe('OnboardingPreferencesScreen', () => {
  beforeEach(async () => {
    mockDb.calls.length = 0;
    await Storage.removeItem(KV_KEYS.onboardingCompleted);
  });

  it('finishes onboarding by saving preferences and marking the gate complete', async () => {
    await render(
      <SafeAreaProvider initialMetrics={safeMetrics}>
        <ThemeProvider>
          <OnboardingStatusProvider>
            <OnboardingPreferencesScreen />
          </OnboardingStatusProvider>
        </ThemeProvider>
      </SafeAreaProvider>,
    );

    expect(await screen.findByText('What are you looking for?')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByTestId(TestIds.onboarding.finish).props.accessibilityState.disabled).toBe(false);
    });
    await fireEvent.press(screen.getByTestId(TestIds.onboarding.finish));
    await waitFor(() => {
      expect(Storage.getItemSync(KV_KEYS.onboardingCompleted)).toBe('1');
    });
    expect(mockDb.calls.some((call) => call.sql.includes('INSERT INTO preferences'))).toBe(true);
  });
});
