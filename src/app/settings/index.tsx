import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useDialog } from '@/components/Dialog';
import { SelectMenu, type SelectOption } from '@/components/Popover';
import type { ThemeMode } from '@/store/themePreference';
import { t, useLanguage, type Lang } from '@/i18n';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { Screen, Txt } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';

export default function SettingsScreen() {
  const { session, profile, signOut } = useAuth();
  const { mode, setMode } = useTheme();
  const lang = useLanguage((s) => s.lang);
  const setLang = useLanguage((s) => s.setLang);
  const modeLabel: Record<ThemeMode, string> = { system: t('System'), light: t('Light'), dark: t('Dark') };
  const themeOptions: SelectOption<ThemeMode>[] = [
    { value: 'system', label: modeLabel.system },
    { value: 'light', label: modeLabel.light },
    { value: 'dark', label: modeLabel.dark },
  ];
  // Each language is shown in its own script so it is recognisable whichever language is active.
  const languageOptions: SelectOption<Lang>[] = [
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'العربية' },
  ];
  const queryClient = useQueryClient();
  const { confirm, notify, dialog } = useDialog();

  const onClearCache = async () => {
    queryClient.clear();
    await queryClient.invalidateQueries();
    await notify(t('Cache cleared'), t('Your feed and profile will reload from the server.'));
  };

  const onSignOut = async () => {
    if (await confirm(t('Sign out?'), undefined, t('Sign out'))) await signOut();
  };

  return (
    <Screen scroll contentStyle={{ paddingVertical: spacing.lg, gap: spacing.xl }}>
      {dialog}
      <SettingsGroup title={t('Account')}>
        <SettingsRow icon="person-circle-outline" label={t('Account')} value={session?.user.email ?? ''} onPress={() => router.push('/settings/account')} />
        <SettingsRow icon="create-outline" label={t('Edit profile')} value={profile ? `@${profile.username}` : ''} onPress={() => router.push('/edit-profile')} />
      </SettingsGroup>

      <SettingsGroup title={t('Preferences')}>
        <SettingsRow
          icon="color-palette-outline"
          label={t('Appearance')}
          right={
            <SelectMenu<ThemeMode>
              options={themeOptions}
              value={mode}
              onChange={setMode}
              accessibilityLabel={t('Appearance: {mode}', { mode: modeLabel[mode] })}
            />
          }
        />
        <SettingsRow
          icon="language-outline"
          label={t('Language')}
          right={<SelectMenu<Lang> options={languageOptions} value={lang} onChange={setLang} accessibilityLabel={t('Language')} />}
        />
        <SettingsRow icon="barbell-outline" label={t('Workout')} onPress={() => router.push('/settings/workout')} />
      </SettingsGroup>

      <SettingsGroup title={t('Support')}>
        <SettingsRow icon="information-circle-outline" label={t('About LiftLog')} onPress={() => router.push('/settings/about')} />
        <SettingsRow icon="refresh-outline" label={t('Clear cached data')} onPress={onClearCache} />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow icon="log-out-outline" label={t('Sign out')} danger onPress={onSignOut} />
      </SettingsGroup>

      <Txt variant="small" style={{ textAlign: 'center' }}>{t('Signed in as {email}', { email: session?.user.email ?? '' })}</Txt>
    </Screen>
  );
}
