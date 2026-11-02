import { SelectMenu } from './Popover';
import { t } from '@/i18n';

/** Off, then 5-second steps up to 2:00, then 15-second steps up to 5:00. */
export const REST_OPTIONS: number[] = [
  0,
  ...Array.from({ length: 24 }, (_, i) => (i + 1) * 5),
  ...Array.from({ length: 12 }, (_, i) => 120 + (i + 1) * 15),
];

export function formatRest(seconds: number): string {
  if (seconds <= 0) return t('Off');
  if (seconds < 60) return t('{s}s', { s: seconds });
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Small dropdown anchored to its trigger for picking an exercise's rest time. */
export function RestTimePicker({ value, onChange }: { value: number; onChange: (seconds: number) => void }) {
  return (
    <SelectMenu
      options={REST_OPTIONS.map((s) => ({ value: s, label: formatRest(s) }))}
      value={value}
      onChange={onChange}
      icon="timer-outline"
      prefix={t('Rest: ')}
      accessibilityLabel={t('Rest time {time}', { time: formatRest(value) })}
    />
  );
}
