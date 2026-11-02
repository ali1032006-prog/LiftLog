import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { radius, spacing } from '@/constants/theme';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { enterPop, PressableScale } from './motion';
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

const ROW = 36;
const MENU_WIDTH = 120;
const MENU_HEIGHT = ROW * 6;

/** Small dropdown anchored to its trigger for picking an exercise's rest time. */
export function RestTimePicker({ value, onChange }: { value: number; onChange: (seconds: number) => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const window = useWindowDimensions();
  const triggerRef = useRef<ComponentRef<typeof View>>(null);
  const listRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; h: number } | null>(null);
  const index = Math.max(0, REST_OPTIONS.indexOf(value));

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x: number, y: number, _w: number, h: number) => setAnchor({ x, y, h }));
  };
  const close = () => setAnchor(null);

  // Open below the trigger, or above it when there is no room below; keep it on screen horizontally.
  let top = 0;
  let left = 0;
  if (anchor) {
    const below = anchor.y + anchor.h + 6;
    top = below + MENU_HEIGHT > window.height - spacing.lg ? Math.max(spacing.lg, anchor.y - MENU_HEIGHT - 6) : below;
    left = Math.min(Math.max(spacing.sm, anchor.x), window.width - MENU_WIDTH - spacing.sm);
  }

  return (
    <>
      <View ref={triggerRef} collapsable={false}>
        <PressableScale onPress={openMenu} style={styles.trigger} accessibilityRole="button" accessibilityLabel={`Rest time ${formatRest(value)}`}>
          <Ionicons name="timer-outline" size={16} color={colors.accent} />
          <Txt style={{ color: colors.accent, fontWeight: '600' }}>Rest: {formatRest(value)}</Txt>
          <Ionicons name="chevron-down" size={16} color={colors.accent} />
        </PressableScale>
      </View>
      <Modal transparent visible={!!anchor} animationType="none" onRequestClose={close}>
        {/* Invisible full-screen layer only to close on outside tap; the menu itself stays small. */}
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="Close rest time menu">
          {anchor ? (
            <Animated.View entering={enterPop} style={[styles.menu, { top, left }]}>
              <Pressable onPress={() => {}}>
                <ScrollView
                  ref={listRef}
                  style={{ maxHeight: MENU_HEIGHT }}
                  showsVerticalScrollIndicator={false}
                  onLayout={() => listRef.current?.scrollTo({ y: Math.max(0, (index - 2) * ROW), animated: false })}
                >
                  {REST_OPTIONS.map((s) => {
                    const active = s === value;
                    return (
                      <Pressable
                        key={s}
                        onPress={() => {
                          onChange(s);
                          close();
                        }}
                        style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && { opacity: 0.6 }]}
                      >
                        <Txt variant="small" style={{ fontWeight: active ? '700' : '500', color: active ? colors.accentText : colors.text }}>
                          {formatRest(s)}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </Pressable>
            </Animated.View>
          ) : null}
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
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  option: { height: ROW, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.pill },
  optionActive: { backgroundColor: colors.accent },
}));
