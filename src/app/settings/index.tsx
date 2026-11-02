import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useDialog } from '@/components/Dialog';
import { SelectMenu, type SelectOption } from '@/components/Popover';
import type { ThemeMode } from '@/store/themePreference';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { Screen, Txt } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';

const MODE_LABEL = { system: 'System', light: 'Light', dark: 'Dark' } as const;
const THEME_OPTIONS: SelectOption<ThemeMode>[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export default function SettingsScreen() {
  const { session, profile, signOut } = useAuth();
  const { mode, setMode } = useTheme();
  const queryClient = useQueryClient();
  const { confirm, notify, dialog } = useDialog();

  const onClearCache = async () => {
    queryClient.clear();
    await queryClient.invalidateQueries();
    await notify('Cache cleared', 'Your feed and profile will reload from the server.');
  };

  const onSignOut = async () => {
    if (await confirm('Sign out?', undefined, 'Sign out')) await signOut();
  };

  return (
    <Screen scroll contentStyle={{ paddingVertical: spacing.lg, gap: spacing.xl }}>
      {dialog}
      <SettingsGroup title="Account">
        <SettingsRow icon="person-circle-outline" label="Account" value={session?.user.email ?? ''} onPress={() => router.push('/settings/account')} />
        <SettingsRow icon="create-outline" label="Edit profile" value={profile ? `@${profile.username}` : ''} onPress={() => router.push('/edit-profile')} />
      </SettingsGroup>

      <SettingsGroup title="Preferences">
        <SettingsRow
          icon="color-palette-outline"
          label="Appearance"
          right={
            <SelectMenu<ThemeMode>
              options={THEME_OPTIONS}
              value={mode}
              onChange={setMode}
              accessibilityLabel={`Appearance: ${MODE_LABEL[mode]}`}
            />
          }
        />
        <SettingsRow icon="barbell-outline" label="Workout" onPress={() => router.push('/settings/workout')} />
      </SettingsGroup>

      <SettingsGroup title="Support">
        <SettingsRow icon="information-circle-outline" label="About LiftLog" onPress={() => router.push('/settings/about')} />
        <SettingsRow icon="refresh-outline" label="Clear cached data" onPress={onClearCache} />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow icon="log-out-outline" label="Sign out" danger onPress={onSignOut} />
      </SettingsGroup>

      <Txt variant="small" style={{ textAlign: 'center' }}>Signed in as {session?.user.email}</Txt>
    </Screen>
  );
}
