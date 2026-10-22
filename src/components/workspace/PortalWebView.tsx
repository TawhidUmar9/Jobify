import type { ComponentProps, ComponentType, Ref, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';
import type { ShouldStartLoadRequest, WebViewOpenWindowEvent } from 'react-native-webview/lib/WebViewTypes';
import { WifiOff } from 'lucide-react-native';

import { TestIds } from '../../constants/testIds';
import { isExternalSchemeUrl, isHttpUrl } from '../../lib/url';
import { useTheme } from '../../theme/ThemeProvider';
import { spacing, typography } from '../../theme/tokens';
import { Button } from '../ui/Button';

/**
 * Imperative WebView methods we use. react-native-webview 14 types the component as a
 * FunctionComponent without a ref, so this interface is the CONTRACT for webViewRef.
 */
export interface WebViewHandle {
  injectJavaScript: (script: string) => void;
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stopLoading: () => void;
}

export type WebViewProps = ComponentProps<typeof RNWebView>;

/** RNWebView with its real ref type. Use this, never RNWebView directly. */
const WebView = RNWebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

export interface WebNavState {
  url: string;
  title: string;
  loading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface PortalWebViewProps {
  webViewRef: RefObject<WebViewHandle | null>;
  /** URL to load. Changing it navigates the single shared WebView. */
  url: string;
  onNavStateChange: (state: WebNavState) => void;
  /** 0..1 load progress. */
  onLoadProgress: (progress: number) => void;
  /** Raw WebViewMessageEvent.nativeEvent.data. */
  onMessage: (raw: string) => void;
}

/**
 * The one WebView instance shared by all portals (cookies persist across portals and restarts).
 * CONTRACT: ARCHITECTURE.md §6.1 lists every prop value. Required props:
 *   source={{ uri: url }}, javaScriptEnabled, domStorageEnabled,
 *   sharedCookiesEnabled (iOS), thirdPartyCookiesEnabled (Android),
 *   originWhitelist={['http://*', 'https://*', 'about:*']},
 *   setSupportMultipleWindows={true} with onOpenWindow → load targetUrl in this same WebView (T-046),
 *   onShouldStartLoadWithRequest → external schemes open via Linking.openURL and return false (T-046),
 *   allowsBackForwardNavigationGestures (iOS), pullToRefreshEnabled (iOS only),
 *   mediaPlaybackRequiresUserAction, webviewDebuggingEnabled={__DEV__},
 *   renderError → in-app error view with Retry (T-046),
 *   onRenderProcessGone (Android) / onContentProcessDidTerminate (iOS) → remount via key++ loading the
 *   last URL seen in onNavigationStateChange, falling back to `url` (T-046).
 * testID TestIds.workspace.webview.
 */
export function PortalWebView({ webViewRef, url, onNavStateChange, onLoadProgress, onMessage }: PortalWebViewProps) {
  const { colors } = useTheme();
  const ios = Platform.OS === 'ios';
  const android = Platform.OS === 'android';

  const [remountKey, setRemountKey] = useState(0);
  const [crashedUrl, setCrashedUrl] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState(url);

  const lastUrlRef = useRef<string>(url);

  if (url !== prevUrl) {
    setPrevUrl(url);
    setCrashedUrl(null);
  }

  useEffect(() => {
    lastUrlRef.current = url;
  }, [url]);

  const handleCrash = () => {
    setCrashedUrl(lastUrlRef.current || url);
    setRemountKey((k) => k + 1);
  };

  const handleOpenWindow = (syntheticEvent: WebViewOpenWindowEvent) => {
    const targetUrl = syntheticEvent.nativeEvent?.targetUrl;
    if (targetUrl && isHttpUrl(targetUrl)) {
      lastUrlRef.current = targetUrl;
      webViewRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(targetUrl)};`);
    }
  };

  const handleShouldStartLoadWithRequest = (request: ShouldStartLoadRequest) => {
    const reqUrl = request?.url;
    if (typeof reqUrl !== 'string' || reqUrl.length === 0) {
      return false;
    }
    if (isExternalSchemeUrl(reqUrl)) {
      Linking.openURL(reqUrl).catch(() => {});
      return false;
    }
    if (/^(https?|about|data|blob):/i.test(reqUrl)) {
      return true;
    }
    return false;
  };

  const renderError = () => (
    <View
      testID={TestIds.workspace.errorView}
      style={[styles.errorWrap, { backgroundColor: colors.background }]}
    >
      <View style={styles.errorContent}>
        <WifiOff size={24} color={colors.textSecondary} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          {"Can't load this page"}
        </Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {"You're offline or the site is down."}
        </Text>
        <Button
          testID={TestIds.workspace.errorRetry}
          label="Try again"
          variant="primary"
          onPress={() => webViewRef.current?.reload()}
        />
      </View>
    </View>
  );

  return (
    <WebView
      key={remountKey}
      ref={webViewRef}
      testID={TestIds.workspace.webview}
      source={{ uri: crashedUrl ?? url }}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['http://*', 'https://*', 'about:*']}
      mediaPlaybackRequiresUserAction
      webviewDebuggingEnabled={__DEV__}
      setSupportMultipleWindows
      onOpenWindow={handleOpenWindow}
      onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
      renderError={renderError}
      onRenderProcessGone={handleCrash}
      onContentProcessDidTerminate={handleCrash}
      {...(ios
        ? {
            sharedCookiesEnabled: true,
            allowsBackForwardNavigationGestures: true,
            pullToRefreshEnabled: true,
          }
        : {})}
      {...(android ? { thirdPartyCookiesEnabled: true } : {})}
      onNavigationStateChange={(e) => {
        lastUrlRef.current = e.url;
        onNavStateChange({
          url: e.url,
          title: e.title,
          loading: e.loading,
          canGoBack: e.canGoBack,
          canGoForward: e.canGoForward,
        });
      }}
      onLoadProgress={(e) => onLoadProgress(e.nativeEvent.progress)}
      onMessage={(e) => onMessage(e.nativeEvent.data)}
    />
  );
}

const styles = StyleSheet.create({
  errorWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  errorContent: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorTitle: {
    ...typography.headline,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.body,
    textAlign: 'center',
  },
});
