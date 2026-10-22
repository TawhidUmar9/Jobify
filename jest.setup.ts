/**
 * Global Jest setup (architect-owned). Mocks native-only libraries so component and hook
 * tests run in Node without an emulator. TEST_PLAN.md §5 documents each mock.
 * Per-test fakes (SQLite database, fetch) live in tests/helpers/.
 */
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// gorhom's mock is CJS without __esModule; flag it so `import BottomSheet from` gets `.default`.
jest.mock('@gorhom/bottom-sheet', () => ({ __esModule: true, ...require('@gorhom/bottom-sheet/mock') }));

// WebView → plain View that keeps testID and exposes the WebViewHandle methods as jest.fn.
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WebView = React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({
      injectJavaScript: jest.fn(),
      goBack: jest.fn(),
      goForward: jest.fn(),
      reload: jest.fn(),
      stopLoading: jest.fn(),
    }));
    return React.createElement(View, { testID: props.testID });
  });
  return { __esModule: true, default: WebView, WebView };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(async () => true),
  getStringAsync: jest.fn(async () => ''),
}));

// In-memory kv-store so services using expo-sqlite/kv-store run in Node.
jest.mock('expo-sqlite/kv-store', () => {
  const map = new Map<string, string>();
  const Storage = {
    getItem: jest.fn(async (k: string) => (map.has(k) ? map.get(k)! : null)),
    setItem: jest.fn(async (k: string, v: string) => void map.set(k, v)),
    removeItem: jest.fn(async (k: string) => void map.delete(k)),
    clear: jest.fn(async () => map.clear()),
    getItemSync: jest.fn((k: string) => (map.has(k) ? map.get(k)! : null)),
    setItemSync: jest.fn((k: string, v: string) => void map.set(k, v)),
  };
  return { __esModule: true, default: Storage, Storage, AsyncStorage: Storage };
});

// Secure store → in-memory map.
jest.mock('expo-secure-store', () => {
  const map = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => (map.has(k) ? map.get(k)! : null)),
    setItemAsync: jest.fn(async (k: string, v: string) => void map.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void map.delete(k)),
  };
});

// Share intent → nothing shared unless a test overrides useShareIntentContext.
jest.mock('expo-share-intent', () => ({
  ShareIntentProvider: ({ children }: { children: unknown }) => children,
  useShareIntentContext: jest.fn(() => ({
    isReady: true,
    hasShareIntent: false,
    shareIntent: { text: null, webUrl: null, files: null, type: null, meta: null },
    resetShareIntent: jest.fn(),
    error: null,
  })),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}));

jest.mock('expo-localization', () => ({
  getCalendars: jest.fn(() => [{ timeZone: 'Asia/Dhaka' }]),
  getLocales: jest.fn(() => [{ regionCode: 'BD', languageTag: 'en-BD', currencyCode: 'BDT' }]),
}));
