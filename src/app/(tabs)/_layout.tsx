import { Tabs } from 'expo-router';
import { Globe, ListChecks, Settings } from 'lucide-react-native';
import { StyleSheet, Text } from 'react-native';

import { TestIds } from '../../constants/testIds';
import { useTheme } from '../../theme/ThemeProvider';
import { fontScaleCaps, typography } from '../../theme/tokens';

/**
 * Bottom tabs: Workspace ("/"), Tracker ("/tracker"), Settings ("/settings-hub"). UI_DIRECTIVES.md §5, T-046e E2.
 * Labels always visible; icons 24; tab labels capped at fontScaleCaps.compact (1.5) so "Workspace",
 * "Tracker" and "Settings" are fully visible at font_scale 2.0.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.textPrimary,
        tabBarLabel: ({ color, children }) => (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={fontScaleCaps.compact}
            style={[styles.tabBarLabel, { color }]}
          >
            {children}
          </Text>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Workspace',
          headerShown: false,
          tabBarButtonTestID: TestIds.tabs.workspace,
          tabBarAccessibilityLabel: 'Workspace, job boards',
          tabBarIcon: ({ color }) => <Globe size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tracker"
        options={{
          title: 'Tracker',
          tabBarButtonTestID: TestIds.tabs.tracker,
          tabBarAccessibilityLabel: 'Tracker, your applications',
          tabBarIcon: ({ color }) => <ListChecks size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings-hub"
        options={{
          title: 'Settings',
          tabBarButtonTestID: TestIds.tabs.settings,
          tabBarAccessibilityLabel: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarLabel: {
    ...typography.caption,
    fontSize: 11,
    lineHeight: 14,
  },
});
