import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { PillTabBar } from '@/components/PillTabBar';
import { IconButton } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';


export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 20 },
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'LiftLog',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={String(color)} />,
          headerRight: () => <IconButton name="search" onPress={() => router.push('/search')} style={{ marginRight: 12 }} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" size={size + 4} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={String(color)} />,
          headerRight: () => <IconButton name="settings-outline" onPress={() => router.push('/settings')} style={{ marginRight: 12 }} />,
        }}
      />
    </Tabs>
  );
}
