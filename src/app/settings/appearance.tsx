import { SegmentedControl } from '@/components/motion';
import { SettingsGroup } from '@/components/SettingsRow';
import { Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeMode } from '@/store/themePreference';

export default function AppearanceScreen() {
  const { mode, setMode } = useTheme();
  return (
    <Screen scroll contentStyle={{ paddingVertical: spacing.lg, gap: spacing.xl }}>
      <SettingsGroup title="Theme" footer="System follows your phone or computer setting. Saved on this device.">
        <SegmentedControl<ThemeMode>
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          value={mode}
          onChange={setMode}
        />
      </SettingsGroup>
    </Screen>
  );
}
