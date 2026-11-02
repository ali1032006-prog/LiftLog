import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { Txt } from './ui';

/** Off, then 5-second steps up to 2:00, then 15-second steps up to 5:00. */
export const REST_OPTIONS: number[] = [
  0,
  ...Array.from({ length: 24 }, (_, i) => (i + 1) * 5),
  ...Array.from({ length: 12 }, (_, i) => 120 + (i + 1) * 15),
];

export function formatRest(seconds: number): string {
  if (seconds <= 0) return 'Off';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Dropdown for an exercise's rest time. */
export function RestTimePicker({ value, onChange }: { value: number; onChange: (seconds: number) => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const listRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const ROW = 44;
  const index = Math.max(0, REST_OPTIONS.indexOf(value));

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.7 }]} accessibilityRole="button">
        <Ionicons name="timer-outline" size={16} color={colors.accent} />
        <Txt style={{ color: colors.accent, fontWeight: '600' }}>Rest: {formatRest(value)}</Txt>
        <Ionicons name="chevron-down" size={16} color={colors.accent} />
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Txt variant="h3" style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>Rest timer</Txt>
            <ScrollView
              ref={listRef}
              style={{ maxHeight: ROW * 7 }}
              // Open centred on the current value (contentOffset is ignored on web, so scroll once laid out).
              onLayout={() => listRef.current?.scrollTo({ y: Math.max(0, (index - 3) * ROW), animated: false })}
            >
              {REST_OPTIONS.map((s) => {
                const active = s === value;
                return (
                  <Pressable
                    key={s}
                    onPress={() => {
                      onChange(s);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [styles.option, { height: ROW }, active && styles.optionActive, pressed && { opacity: 0.6 }]}
                  >
                    <Txt style={{ fontWeight: active ? '700' : '400', color: active ? colors.accent : colors.text }}>{formatRest(s)}</Txt>
                    {active ? <Ionicons name="checkmark" size={18} color={colors.accent} /> : <View />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  sheet: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    paddingBottom: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  optionActive: { backgroundColor: colors.surfaceAlt },
}));
