import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { Paywall, PremiumIntro } from '@/components/Paywall';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { AppThemeProvider, useTheme } from '@/hooks/useTheme';
import { t, useLanguage } from '@/i18n';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <AuthProvider>
          <ThemedApp />
        </AuthProvider>
      </AppThemeProvider>
    </QueryClientProvider>
  );
}

function ThemedApp() {
  const { colors, scheme } = useTheme();
  // Re-mount the whole UI when the language changes so every string re-renders in the new language.
  const lang = useLanguage((s) => s.lang);
  const base = scheme === 'light' ? DefaultTheme : DarkTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: colors.bg, card: colors.bg, text: colors.text, border: colors.border, primary: colors.accent },
  };
  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      <RootNavigator key={lang} />
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { colors } = useTheme();
  const { session, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <>
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
        animationDuration: 200,
      }}
    >
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="workout/active" options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="workout/[id]" options={{ title: t('Workout') }} />
        <Stack.Screen name="routine/[id]" options={{ title: t('Routine') }} />
        <Stack.Screen name="user/[id]/index" options={{ title: '' }} />
        <Stack.Screen name="user/[id]/followers" options={{ title: t('Followers') }} />
        <Stack.Screen name="user/[id]/following" options={{ title: t('Following') }} />
        <Stack.Screen name="search" options={{ title: t('Find people') }} />
        <Stack.Screen name="settings/index" options={{ title: t('Settings') }} />
        <Stack.Screen name="settings/account" options={{ title: t('Account') }} />
        <Stack.Screen name="settings/workout" options={{ title: t('Workout') }} />
        <Stack.Screen name="settings/about" options={{ title: t('About') }} />
        <Stack.Screen name="edit-profile" options={{ title: t('Edit profile') }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
    {session ? (
      <>
        <Paywall />
        <PremiumIntro />
      </>
    ) : null}
    </>
  );
}
