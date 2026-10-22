import { Stack } from 'expo-router';

import { useTheme } from '../../theme/ThemeProvider';

/** Settings sub-screens, pushed from the Settings tab. Titles per UI_DIRECTIVES.md §4.3. */
export default function SettingsLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="ai" options={{ title: 'AI provider' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="resumes" options={{ title: 'Resumes' }} />
      <Stack.Screen name="resume/[id]" options={{ title: 'Edit resume' }} />
      <Stack.Screen name="preferences" options={{ title: 'Job preferences' }} />
      <Stack.Screen name="boards" options={{ title: 'Job boards' }} />
      <Stack.Screen name="answers" options={{ title: 'Answer bank' }} />
      <Stack.Screen name="backup" options={{ title: 'Backup' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
    </Stack>
  );
}
