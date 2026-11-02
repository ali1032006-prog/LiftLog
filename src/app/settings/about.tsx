import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { Screen, Txt } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { LIBRARY_EXERCISES } from '@/data/exercises';
import { t, tn } from '@/i18n';

export default function AboutScreen() {
  return (
    <Screen scroll contentStyle={{ paddingVertical: spacing.lg, gap: spacing.xl }}>
      <SettingsGroup title="LiftLog">
        <SettingsRow icon="pricetag-outline" label={t('Version')} value={Constants.expoConfig?.version ?? '1.0.0'} />
        <SettingsRow icon="hardware-chip-outline" label={t('Platform')} value={Platform.OS === 'web' ? t('Web') : Platform.OS === 'ios' ? 'iOS' : 'Android'} />
        <SettingsRow icon="barbell-outline" label={t('Exercise library')} value={tn(LIBRARY_EXERCISES.length, '{count} exercise', '{count} exercises')} />
      </SettingsGroup>
      <Txt variant="small" style={{ textAlign: 'center' }}>{t('Built with Expo and Supabase.')}</Txt>
    </Screen>
  );
}
