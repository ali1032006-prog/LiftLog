import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { Screen, Txt } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { LIBRARY_EXERCISES } from '@/data/exercises';

export default function AboutScreen() {
  return (
    <Screen scroll contentStyle={{ paddingVertical: spacing.lg, gap: spacing.xl }}>
      <SettingsGroup title="LiftLog">
        <SettingsRow icon="pricetag-outline" label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} />
        <SettingsRow icon="hardware-chip-outline" label="Platform" value={Platform.OS === 'web' ? 'Web' : Platform.OS === 'ios' ? 'iOS' : 'Android'} />
        <SettingsRow icon="barbell-outline" label="Exercise library" value={`${LIBRARY_EXERCISES.length} exercises`} />
      </SettingsGroup>
      <Txt variant="small" style={{ textAlign: 'center' }}>Built with Expo and Supabase.</Txt>
    </Screen>
  );
}
