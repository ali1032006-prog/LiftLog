import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { PillTabBar } from '@/components/PillTabBar';
import { IconButton } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { t } from '@/i18n';


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
          title: t('Home'),
          headerTitle: 'LiftLog',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={String(color)} />,
          headerRight: () => <IconButton name="search" onPress={() => router.push('/search')} style={{ marginRight: 12 }} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: t('Workout'),
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell" size={size + 2} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="weight"
        options={{
          title: t('Weight'),
          tabBarIcon: ({ color, size }) => <Ionicons name="scale" size={size} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="coach"
        options={{
          title: t('Coach'),
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" size={size} color={String(color)} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('Account'),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={String(color)} />,
          headerRight: () => <IconButton name="settings-outline" onPress={() => router.push('/settings')} style={{ marginRight: 12 }} />,
        }}
      />
    </Tabs>
  );
}
