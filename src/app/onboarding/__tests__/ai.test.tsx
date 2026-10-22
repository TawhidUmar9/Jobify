import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TestIds } from '../../../constants/testIds';
import { loadAiConfig } from '../../../services/ai/config';
import { API_KEY_STORE_KEY } from '../../../services/secrets';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import OnboardingAiScreen from '../ai';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockPush(...args) },
}));

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  const Icon = (props: Record<string, unknown>) => React.createElement(View, props);
  return { Eye: Icon, EyeOff: Icon, CircleCheck: Icon };
});

const safeMetrics = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={safeMetrics}>
      <ThemeProvider>
        <OnboardingAiScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe('OnboardingAiScreen', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    await Storage.clear();
    await SecureStore.deleteItemAsync(API_KEY_STORE_KEY);
  });

  it('skips without saving and continues by saving the draft', async () => {
    await renderScreen();
    expect(await screen.findByText('Connect an AI provider')).toBeTruthy();
    expect(screen.getByText('Step 1 of 3')).toBeTruthy();
    expect(screen.getByText('You can browse and track without AI')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(TestIds.onboarding.skip));
    expect(mockPush).toHaveBeenCalledWith('/onboarding/profile');
    expect(await loadAiConfig()).toBeNull();

    mockPush.mockClear();
    await fireEvent.changeText(screen.getByTestId(TestIds.aiForm.model), '');
    expect(screen.getByText('Enter a model name')).toBeTruthy();
    await fireEvent.press(screen.getByTestId(TestIds.onboarding.next));
    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalled();
    });
    expect(await loadAiConfig()).toBeNull();

    await fireEvent.changeText(screen.getByTestId(TestIds.aiForm.model), 'gemini-3.8-flash');
    await fireEvent.press(screen.getByTestId(TestIds.onboarding.next));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/onboarding/profile');
    });
    expect(await loadAiConfig()).toEqual({
      provider: 'gemini',
      model: 'gemini-3.8-flash',
      baseUrl: 'https://generativelanguage.googleapis.com',
    });
  });
});
