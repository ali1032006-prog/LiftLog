import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ZoomIn,
} from 'react-native-reanimated';
import { radius } from '@/constants/theme';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { Txt } from './ui';

/** The one spring used across the app (same feel as the bottom navigation pill). */
export const SPRING = { damping: 20, stiffness: 220, mass: 0.7 } as const;

/** Entering/exiting presets built on the same spring. */
export const enterCard = (index = 0) => FadeInDown.springify().damping(SPRING.damping).stiffness(SPRING.stiffness).mass(SPRING.mass).delay(Math.min(index, 8) * 40);
export const enterPop = ZoomIn.springify().damping(SPRING.damping).stiffness(SPRING.stiffness).mass(SPRING.mass);
/**
 * Dropdown menus pop in twice as fast. A spring's settle time scales with sqrt(mass / stiffness),
 * so 4x stiffness halves it; doubling damping keeps the same (slight) bounce.
 */
export const enterMenu = ZoomIn.springify().damping(SPRING.damping * 2).stiffness(SPRING.stiffness * 4).mass(SPRING.mass);
export const enterFade = FadeIn.duration(160);
export const exitFade = FadeOut.duration(140);
export const layoutSpring = LinearTransition.springify().damping(SPRING.damping).stiffness(SPRING.stiffness).mass(SPRING.mass);

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed (default 0.96). */
  pressedScale?: number;
};

/** Pressable that springs down slightly when pressed and back on release. */
export function PressableScale({ style, pressedScale = 0.96, onPressIn, onPressOut, disabled, children, ...rest }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        scale.set(withSpring(pressedScale, SPRING));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, SPRING));
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

type SegmentOption<T extends string> = { value: T; label: string };

/** Segmented control with a pill that springs to the selected option, like the tab bar. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  small,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  small?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  // Small controls have fixed-size options; full-size ones share the measured width.
  const segment = small ? SMALL_OPTION : width / options.length;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  const placed = useRef(false);

  useEffect(() => {
    if (segment <= 0) return;
    if (!placed.current) {
      x.set(index * segment);
      placed.current = true;
    } else {
      x.set(withSpring(index * segment, SPRING));
    }
  }, [index, segment, x]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      style={[styles.track, small && { alignSelf: 'flex-start', width: SMALL_OPTION * options.length + PAD * 2 }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width - PAD * 2)}
    >
      {segment > 0 ? <Animated.View style={[styles.pill, { width: segment }, pillStyle]} /> : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.option, small && styles.optionSmall]}
          >
            <Txt variant={small ? 'small' : 'body'} style={{ fontWeight: '700', color: active ? colors.accentText : colors.text }}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const PAD = 3;
const SMALL_OPTION = 44;

const useStyles = makeStyles((colors) => ({
  track: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: PAD },
  pill: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: radius.pill, backgroundColor: colors.accent },
  option: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.pill },
  // Fixed width so every option (and the pill) is the same size.
  // Explicit basis: on web `flex: 1` from `option` leaves flexBasis 0%, which would override the width.
  optionSmall: { flexGrow: 0, flexShrink: 0, flexBasis: SMALL_OPTION, width: SMALL_OPTION, paddingVertical: 4 },
}));

/** Wrapper that fades a removed item out and springs its siblings into place. No entrance animation. */
export function AnimatedItem({ index = 0, children, style }: { index?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View exiting={exitFade} layout={layoutSpring} style={style}>
      {children}
    </Animated.View>
  );
}
