import type { ComponentProps, ComponentType, Ref, RefObject } from 'react';
import { Platform } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';

import { TestIds } from '../../constants/testIds';

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
  const ios = Platform.OS === 'ios';
  const android = Platform.OS === 'android';
  // TODO(T-046): resilience props.
  return (
    <WebView
      ref={webViewRef}
      testID={TestIds.workspace.webview}
      source={{ uri: url }}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['http://*', 'https://*', 'about:*']}
      mediaPlaybackRequiresUserAction
      webviewDebuggingEnabled={__DEV__}
      {...(ios
        ? {
            sharedCookiesEnabled: true,
            allowsBackForwardNavigationGestures: true,
            pullToRefreshEnabled: true,
          }
        : {})}
      {...(android ? { thirdPartyCookiesEnabled: true } : {})}
      onNavigationStateChange={(e) =>
        onNavStateChange({
          url: e.url,
          title: e.title,
          loading: e.loading,
          canGoBack: e.canGoBack,
          canGoForward: e.canGoForward,
        })
      }
      onLoadProgress={(e) => onLoadProgress(e.nativeEvent.progress)}
      onMessage={(e) => onMessage(e.nativeEvent.data)}
    />
  );
}
