import { SegmentedControl } from '@/components/motion';
import { RestTimePicker } from '@/components/RestTimePicker';
import { SettingsGroup, SettingsRow } from '@/components/SettingsRow';
import { Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import type { WeightUnit } from '@/lib/units';
import { usePreferences } from '@/store/preferences';
import { t } from '@/i18n';

export default function WorkoutSettingsScreen() {
  const prefs = usePreferences();
  return (
    <Screen scroll contentStyle={{ paddingVertical: spacing.lg, gap: spacing.xl }}>
      <SettingsGroup title={t('New exercises')} footer={t('Used the first time you log an exercise. After that, each exercise remembers its own unit.')}>
        <SettingsRow
          icon="timer-outline"
          label={t('Default rest timer')}
          right={<RestTimePicker value={prefs.defaultRestSeconds} onChange={(s) => prefs.set({ defaultRestSeconds: s })} />}
        />
        <SettingsRow
          icon="scale-outline"
          label={t('Default weight unit')}
          right={
            <SegmentedControl<WeightUnit>
              small
              options={[{ value: 'kg', label: t('kg') }, { value: 'lb', label: t('lb') }]}
              value={prefs.defaultUnit}
              onChange={(u) => prefs.set({ defaultUnit: u })}
            />
          }
        />
      </SettingsGroup>

      <SettingsGroup title={t('During a workout')} footer={t('Saved on this device.')}>
        <SettingsRow
          icon="play-circle-outline"
          label={t('Start rest timer after a set')}
          toggle={{ value: prefs.autoStartRest, onChange: (v) => prefs.set({ autoStartRest: v }) }}
        />
        <SettingsRow
          icon="phone-portrait-outline"
          label={t('Haptic feedback')}
          toggle={{ value: prefs.haptics, onChange: (v) => prefs.set({ haptics: v }) }}
        />
        <SettingsRow
          icon="sunny-outline"
          label={t('Keep screen awake')}
          toggle={{ value: prefs.keepAwake, onChange: (v) => prefs.set({ keepAwake: v }) }}
        />
      </SettingsGroup>
    </Screen>
  );
}
