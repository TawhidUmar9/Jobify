import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React, { createRef } from 'react';
import { Linking } from 'react-native';

import { TestIds } from '../../../constants/testIds';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { PortalWebView, type WebViewHandle } from '../PortalWebView';

interface MockWebViewProps {
  source?: { uri: string };
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  setSupportMultipleWindows?: boolean;
  originWhitelist?: string[];
  testID?: string;
  onShouldStartLoadWithRequest?: (req: { url: string }) => boolean;
  onOpenWindow?: (event: { nativeEvent: { targetUrl: string } }) => void;
  renderError?: (errorDomain: string, errorCode: number, errorDesc: string) => React.ReactElement;
  onNavigationStateChange?: (state: {
    url: string;
    title: string;
    loading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
  }) => void;
  onRenderProcessGone?: () => void;
  onContentProcessDidTerminate?: () => void;
}

let lastProps: MockWebViewProps = {};
const mockHandle: WebViewHandle = {
  injectJavaScript: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  reload: jest.fn(),
  stopLoading: jest.fn(),
};

const mockSnackbarShow = jest.fn();
jest.mock('../../../components/ui/Snackbar', () => {
  const actual = jest.requireActual('../../../components/ui/Snackbar');
  return {
    ...actual,
    useSnackbar: () => ({ show: mockSnackbarShow }),
  };
});

jest.mock('react-native-webview', () => {
  const MockReact = jest.requireActual('react') as typeof import('react');
  const MockRN = jest.requireActual('react-native') as typeof import('react-native');
  const WebView = MockReact.forwardRef(
    (props: MockWebViewProps, ref: React.ForwardedRef<WebViewHandle>) => {
      lastProps = props;
      MockReact.useImperativeHandle(ref, () => mockHandle);
      return MockReact.createElement(MockRN.View, { testID: props.testID });
    },
  );
  WebView.displayName = 'MockWebView';
  return { __esModule: true, default: WebView, WebView };
});

describe('PortalWebView resilience (T-046, T-046e E1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastProps = {};
    mockSnackbarShow.mockClear();
  });

  it('renders webview with required configuration props', async () => {
    const webViewRef = createRef<WebViewHandle>();
    await render(
      <ThemeProvider>
        <PortalWebView
          webViewRef={webViewRef}
          url="https://wellfound.com/jobs"
          onNavStateChange={jest.fn()}
          onLoadProgress={jest.fn()}
          onMessage={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByTestId(TestIds.workspace.webview)).toBeTruthy();
    expect(lastProps.source).toEqual({ uri: 'https://wellfound.com/jobs' });
    expect(lastProps.javaScriptEnabled).toBe(true);
    expect(lastProps.domStorageEnabled).toBe(true);
    expect(lastProps.setSupportMultipleWindows).toBe(true);
    expect(lastProps.originWhitelist).toEqual(['*']);
  });

  describe('onShouldStartLoadWithRequest', () => {
    it('opens external schemes via Linking and returns false', async () => {
      const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
      const webViewRef = createRef<WebViewHandle>();
      await render(
        <ThemeProvider>
          <PortalWebView
            webViewRef={webViewRef}
            url="https://wellfound.com/jobs"
            onNavStateChange={jest.fn()}
            onLoadProgress={jest.fn()}
            onMessage={jest.fn()}
          />
        </ThemeProvider>,
      );

      const mailResult = lastProps.onShouldStartLoadWithRequest?.({ url: 'mailto:hr@example.com' });
      expect(mailResult).toBe(false);
      expect(openSpy).toHaveBeenCalledWith('mailto:hr@example.com');

      const telResult = lastProps.onShouldStartLoadWithRequest?.({ url: 'tel:+15551234567' });
      expect(telResult).toBe(false);
      expect(openSpy).toHaveBeenCalledWith('tel:+15551234567');
    });

    it('shows snackbar when opening external link fails (T-046b F7, T-046e E1)', async () => {
      jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('No handler'));
      const webViewRef = createRef<WebViewHandle>();
      await render(
        <ThemeProvider>
          <PortalWebView
            webViewRef={webViewRef}
            url="https://wellfound.com/jobs"
            onNavStateChange={jest.fn()}
            onLoadProgress={jest.fn()}
            onMessage={jest.fn()}
          />
        </ThemeProvider>,
      );

      const mailResult = lastProps.onShouldStartLoadWithRequest?.({ url: 'mailto:hr@example.com' });
      expect(mailResult).toBe(false);
      await Promise.resolve();
      expect(mockSnackbarShow).toHaveBeenCalledWith('No app on this phone can open this link.');
    });

    it('allows http(s) and about:blank (T-046e E1)', async () => {
      const webViewRef = createRef<WebViewHandle>();
      await render(
        <ThemeProvider>
          <PortalWebView
            webViewRef={webViewRef}
            url="https://wellfound.com/jobs"
            onNavStateChange={jest.fn()}
            onLoadProgress={jest.fn()}
            onMessage={jest.fn()}
          />
        </ThemeProvider>,
      );

      expect(lastProps.onShouldStartLoadWithRequest?.({ url: 'https://example.com' })).toBe(true);
      expect(lastProps.onShouldStartLoadWithRequest?.({ url: 'http://example.com' })).toBe(true);
      expect(lastProps.onShouldStartLoadWithRequest?.({ url: 'about:blank' })).toBe(true);
    });

    it('rejects other schemes (file:, javascript:, data:, unknown) and empty URLs (T-046e E1)', async () => {
      const webViewRef = createRef<WebViewHandle>();
      await render(
        <ThemeProvider>
          <PortalWebView
            webViewRef={webViewRef}
            url="https://wellfound.com/jobs"
            onNavStateChange={jest.fn()}
            onLoadProgress={jest.fn()}
            onMessage={jest.fn()}
          />
        </ThemeProvider>,
      );

      expect(lastProps.onShouldStartLoadWithRequest?.({ url: 'javascript:alert(1)' })).toBe(false);
      expect(lastProps.onShouldStartLoadWithRequest?.({ url: 'file:///path/to/file' })).toBe(false);
      expect(lastProps.onShouldStartLoadWithRequest?.({ url: 'data:text/html,...' })).toBe(false);
      expect(lastProps.onShouldStartLoadWithRequest?.({ url: 'blob:https://example.com/uuid' })).toBe(false);
      expect(lastProps.onShouldStartLoadWithRequest?.({ url: 'custom:foo' })).toBe(false);
      expect(lastProps.onShouldStartLoadWithRequest?.({ url: '' })).toBe(false);
    });
  });

  describe('onOpenWindow', () => {
    it('loads http(s) targetUrl in the same WebView via injectJavaScript', async () => {
      const webViewRef = createRef<WebViewHandle>();
      await render(
        <ThemeProvider>
          <PortalWebView
            webViewRef={webViewRef}
            url="https://wellfound.com/jobs"
            onNavStateChange={jest.fn()}
            onLoadProgress={jest.fn()}
            onMessage={jest.fn()}
          />
        </ThemeProvider>,
      );

      lastProps.onOpenWindow?.({
        nativeEvent: { targetUrl: 'https://wellfound.com/jobs/detail' },
      });

      expect(mockHandle.injectJavaScript).toHaveBeenCalledWith(
        'window.location.href = "https://wellfound.com/jobs/detail";',
      );
    });
  });

  describe('renderError', () => {
    it('renders error view with retry button that calls reload', async () => {
      const webViewRef = createRef<WebViewHandle>();
      await render(
        <ThemeProvider>
          <PortalWebView
            webViewRef={webViewRef}
            url="https://wellfound.com/jobs"
            onNavStateChange={jest.fn()}
            onLoadProgress={jest.fn()}
            onMessage={jest.fn()}
          />
        </ThemeProvider>,
      );

      const errorEl = lastProps.renderError?.('domain', 500, 'Error');
      if (!errorEl) throw new Error('renderError returned undefined');
      await render(
        <ThemeProvider>{errorEl}</ThemeProvider>,
      );

      expect(screen.getByTestId(TestIds.workspace.errorView)).toBeTruthy();
      expect(screen.getByText("Can't load this page")).toBeTruthy();
      expect(screen.getByText("You're offline or the site is down.")).toBeTruthy();

      const retryBtn = screen.getByTestId(TestIds.workspace.errorRetry);
      fireEvent.press(retryBtn);
      expect(mockHandle.reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('crash recovery', () => {
    it('remounts loading the last URL seen in onNavigationStateChange', async () => {
      const webViewRef = createRef<WebViewHandle>();
      const onNavStateChange = jest.fn();
      await render(
        <ThemeProvider>
          <PortalWebView
            webViewRef={webViewRef}
            url="https://wellfound.com/jobs"
            onNavStateChange={onNavStateChange}
            onLoadProgress={jest.fn()}
            onMessage={jest.fn()}
          />
        </ThemeProvider>,
      );

      expect(lastProps.source).toEqual({ uri: 'https://wellfound.com/jobs' });

      // Navigate to a new page
      await act(async () => {
        lastProps.onNavigationStateChange?.({
          url: 'https://wellfound.com/jobs/42',
          title: 'Job 42',
          loading: false,
          canGoBack: true,
          canGoForward: false,
        });
      });
      expect(onNavStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ url: 'https://wellfound.com/jobs/42' }),
      );

      // Simulate renderer crash on Android
      await act(async () => {
        lastProps.onRenderProcessGone?.();
      });

      // Remounted webview should have the navigated url as source
      expect(lastProps.source).toEqual({ uri: 'https://wellfound.com/jobs/42' });
    });

    it('falls back to initial url if crash happens before any navigation', async () => {
      const webViewRef = createRef<WebViewHandle>();
      await render(
        <ThemeProvider>
          <PortalWebView
            webViewRef={webViewRef}
            url="https://remoteok.com"
            onNavStateChange={jest.fn()}
            onLoadProgress={jest.fn()}
            onMessage={jest.fn()}
          />
        </ThemeProvider>,
      );

      // Simulate crash on iOS
      await act(async () => {
        lastProps.onContentProcessDidTerminate?.();
      });

      expect(lastProps.source).toEqual({ uri: 'https://remoteok.com' });
    });
  });
});
