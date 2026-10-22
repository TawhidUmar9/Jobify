import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { ShareIntentProvider } from 'expo-share-intent';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SnackbarProvider } from '../components/ui/Snackbar';
import { migrateDbIfNeeded } from '../db/migrate';
import { DATABASE_NAME } from '../db/schema';
import { OnboardingStatusProvider, useOnboardingStatus } from '../features/onboarding/useOnboardingStatus';
import { useIncomingShare } from '../features/share/useIncomingShare';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';

export { ErrorBoundary } from 'expo-router';

/**
 * Root layout. Provider order (outer → inner) is a CONTRACT (ARCHITECTURE.md §7):
 * GestureHandlerRootView → SafeAreaProvider → ThemeProvider → SQLiteProvider(onInit=migrate)
 * → ShareIntentProvider → SnackbarProvider → OnboardingStatusProvider → RootStack.
 * Gate: onboarding routes only while not completed; everything else only after (Stack.Protected).
 */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
            <ShareIntentProvider options={{ resetOnBackground: true }}>
              <SnackbarProvider>
                <OnboardingStatusProvider>
                  <RootStack />
                </OnboardingStatusProvider>
              </SnackbarProvider>
            </ShareIntentProvider>
          </SQLiteProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const { colors, scheme } = useTheme();
  const { completed } = useOnboardingStatus();
  useIncomingShare();
  // Keep the splash background while the flag loads (no flash of the wrong stack).
  if (completed === null) return null;
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={completed}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="application/[id]" options={{ title: 'Application' }} />
          <Stack.Screen name="insights" options={{ title: 'Insights' }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!completed}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}
