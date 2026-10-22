import { render, screen, waitFor } from '@testing-library/react-native';
import { useShareIntentContext } from 'expo-share-intent';
import Storage from 'expo-sqlite/kv-store';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SnackbarProvider } from '../../../components/ui/Snackbar';
import { TestIds } from '../../../constants/testIds';
import { OnboardingStatusProvider } from '../../onboarding/useOnboardingStatus';
import { KV_KEYS } from '../../../services/kvStore';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { useIncomingShare } from '../useIncomingShare';

const mockNavigate = jest.fn();
const mockReset = jest.fn();

jest.mock('expo-router', () => ({
  router: { navigate: (...args: unknown[]) => mockNavigate(...args) },
}));

const shareContext = useShareIntentContext as jest.Mock;

const safeMetrics = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  frame: { x: 0, y: 0, width: 390, height: 844 },
};

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider initialMetrics={safeMetrics}>
      <ThemeProvider>
        <SnackbarProvider>
          <OnboardingStatusProvider>{children}</OnboardingStatusProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Probe() {
  useIncomingShare();
  return null;
}

function shareOf(webUrl: string | null, text: string | null, hasShareIntent = true) {
  shareContext.mockReturnValue({
    isReady: true,
    hasShareIntent,
    shareIntent: { text, webUrl, files: null, type: webUrl ? 'weburl' : 'text', meta: null },
    resetShareIntent: mockReset,
    error: null,
  });
}

describe('useIncomingShare', () => {
  beforeEach(async () => {
    mockNavigate.mockClear();
    mockReset.mockClear();
    shareOf(null, null, false);
    await Storage.removeItem(KV_KEYS.onboardingCompleted);
  });

  it('opens the first link in shared text and strips trailing punctuation', async () => {
    await Storage.setItem(KV_KEYS.onboardingCompleted, '1');
    shareOf(null, 'Look https://x.y/z.');
    await render(
      <Wrapper>
        <Probe />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/', params: { url: 'https://x.y/z' } }),
    );
    expect(mockReset).toHaveBeenCalled();
    expect(screen.queryByTestId(TestIds.snackbarText)).toBeNull();
  });

  it('prefers shareIntent.webUrl', async () => {
    await Storage.setItem(KV_KEYS.onboardingCompleted, '1');
    shareOf('https://jobs.example/1', 'Look https://x.y/z.');
    await render(
      <Wrapper>
        <Probe />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/', params: { url: 'https://jobs.example/1' } }),
    );
  });

  it('shows a snackbar when the share has no link', async () => {
    await Storage.setItem(KV_KEYS.onboardingCompleted, '1');
    shareOf(null, 'No address in this note');
    await render(
      <Wrapper>
        <Probe />
      </Wrapper>,
    );
    expect(await screen.findByText('No link found in what you shared')).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockReset).toHaveBeenCalled();
  });

  it('ignores a share before onboarding is complete', async () => {
    shareOf(null, 'Look https://x.y/z.');
    await render(
      <Wrapper>
        <Probe />
      </Wrapper>,
    );
    await waitFor(() => expect(mockReset).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.queryByText('No link found in what you shared')).toBeNull();
  });

  it('waits while onboarding status is still loading', async () => {
    let release: (value: string | null) => void = () => {};
    const getItem = Storage.getItem as jest.MockedFunction<typeof Storage.getItem>;
    getItem.mockImplementationOnce(() => new Promise((resolve) => {
      release = resolve;
    }));
    shareOf(null, 'Look https://x.y/z.');
    await render(
      <Wrapper>
        <Probe />
      </Wrapper>,
    );
    expect(mockReset).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    release(null);
    await waitFor(() => expect(mockReset).toHaveBeenCalled());
  });
});
