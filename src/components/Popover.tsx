import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, type ComponentProps, type ComponentRef, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { radius, spacing } from '@/constants/theme';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { enterMenu, PressableScale } from './motion';
import { Txt } from './ui';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Anchor = { x: number; y: number; w: number; h: number };

export const MENU_ROW = 36;
export const MENU_WIDTH = 120;

/**
 * Small floating panel anchored to a trigger. No dimmed overlay: an invisible layer only
 * closes it on outside taps. Opens below the trigger, or above when there is no room.
 */
function Popover({
  anchor,
  width,
  height,
  align = 'left',
  onClose,
  children,
}: {
  anchor: Anchor | null;
  width: number;
  height: number;
  align?: 'left' | 'right';
  onClose: () => void;
  children: ReactNode;
}) {
  const styles = useStyles();
  const window = useWindowDimensions();
  let top = 0;
  let left = 0;
  if (anchor) {
    const below = anchor.y + anchor.h + 6;
    top = below + height > window.height - spacing.lg ? Math.max(spacing.lg, anchor.y - height - 6) : below;
    const preferred = align === 'right' ? anchor.x + anchor.w - width : anchor.x;
    left = Math.min(Math.max(spacing.sm, preferred), window.width - width - spacing.sm);
  }
  return (
    <Modal transparent visible={!!anchor} animationType="none" onRequestClose={onClose}>
      <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close menu">
        {anchor ? (
          <Animated.View entering={enterMenu} style={[styles.panel, { top, left, width }]}>
            <Pressable onPress={() => {}}>{children}</Pressable>
          </Animated.View>
        ) : null}
      </Pressable>
    </Modal>
  );
}

function useAnchor() {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const open = () => ref.current?.measureInWindow((x: number, y: number, w: number, h: number) => setAnchor({ x, y, w, h }));
  const close = () => setAnchor(null);
  return { ref, anchor, open, close };
}

export type SelectOption<T> = { value: T; label: string };

/** Pill-shaped dropdown for choosing one value from a short or scrollable list. */
export function SelectMenu<T extends string | number>({
  options,
  value,
  onChange,
  icon,
  prefix,
  accessibilityLabel,
  visibleRows = 6,
}: {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  icon?: IconName;
  /** Text before the selected label on the trigger, e.g. "Rest: ". */
  prefix?: string;
  accessibilityLabel?: string;
  visibleRows?: number;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { ref, anchor, open, close } = useAnchor();
  const listRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const current = options[index]?.label ?? '';
  const height = Math.min(options.length, visibleRows) * MENU_ROW + 8;

  return (
    <>
      <View ref={ref} collapsable={false}>
        <PressableScale onPress={open} style={styles.trigger} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? current}>
          {icon ? <Ionicons name={icon} size={16} color={colors.accent} /> : null}
          <Txt style={{ color: colors.accent, fontWeight: '600' }}>{prefix}{current}</Txt>
          <Ionicons name="chevron-down" size={16} color={colors.accent} />
        </PressableScale>
      </View>
      <Popover anchor={anchor} width={MENU_WIDTH} height={height} align="right" onClose={close}>
        <ScrollView
          ref={listRef}
          style={{ maxHeight: height - 8 }}
          showsVerticalScrollIndicator={false}
          onLayout={() => listRef.current?.scrollTo({ y: Math.max(0, (index - 2) * MENU_ROW), animated: false })}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <Pressable
                key={String(o.value)}
                onPress={() => {
                  onChange(o.value);
                  close();
                }}
                accessibilityRole="menuitem"
                style={({ pressed }) => [styles.option, active && styles.optionActive, pressed && { opacity: 0.6 }]}
              >
                <Txt variant="small" style={{ fontWeight: active ? '700' : '500', color: active ? colors.accentText : colors.text }}>
                  {o.label}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      </Popover>
    </>
  );
}

export type MenuAction = { label: string; icon: IconName; onPress: () => void; danger?: boolean };

/** Three-dots button that opens a small menu of actions with icons. */
export function ActionMenu({ actions, accessibilityLabel = 'More options' }: { actions: MenuAction[]; accessibilityLabel?: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { ref, anchor, open, close } = useAnchor();
  const width = 150;
  return (
    <>
      <View ref={ref} collapsable={false}>
        <PressableScale onPress={open} hitSlop={8} style={styles.dots} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
        </PressableScale>
      </View>
      <Popover anchor={anchor} width={width} height={actions.length * 40 + 8} align="right" onClose={close}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={() => {
              close();
              a.onPress();
            }}
            accessibilityRole="menuitem"
            style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.surfaceAlt }]}
          >
            <Ionicons name={a.icon} size={18} color={a.danger ? colors.danger : colors.text} />
            <Txt style={{ fontWeight: '600', color: a.danger ? colors.danger : colors.text }}>{a.label}</Txt>
          </Pressable>
        ))}
      </Popover>
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  panel: {
    position: 'absolute',
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
  option: { height: MENU_ROW, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.pill },
  optionActive: { backgroundColor: colors.accent },
  dots: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: 40, paddingHorizontal: spacing.md, borderRadius: radius.md },
}));
