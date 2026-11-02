import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { radius } from '@/constants/theme';
import { isRTL, useLanguage } from '@/i18n';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { Txt } from './ui';

/** Upper limit for every UI animation in the app (ms). */
export const ANIM_MS = 200;
/** Fast start, soft landing; used by every timed animation. */
export const EASE_OUT = Easing.out(Easing.cubic);

/** Animate a shared value to `value` within the app's duration cap. */
export const animateTo = (value: number, ms: number = ANIM_MS) => withTiming(value, { duration: ms, easing: EASE_OUT });

// Entering/exiting presets. On web Reanimated only honours duration/delay/easing for these,
// so they are timed (not springs) to guarantee the length.
export const enterPop = ZoomIn.duration(ANIM_MS).easing(EASE_OUT);
export const enterMenu = enterPop;
export const enterSheet = SlideInDown.duration(ANIM_MS).easing(EASE_OUT);
export const enterFade = FadeIn.duration(150);
export const exitFade = FadeOut.duration(140);
export const layoutSpring = LinearTransition.duration(ANIM_MS).easing(EASE_OUT);

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
        scale.set(animateTo(pressedScale, 100));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(animateTo(1, 150));
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
  // Subscribe so the pill repositions when the saved language finishes loading or changes.
  const rtl = useLanguage((s) => s.lang) === 'ar';

  useEffect(() => {
    if (segment <= 0) return;
    // Right-to-left layouts put the first option on the right.
    const target = (rtl ? options.length - 1 - index : index) * segment;
    if (!placed.current) {
      x.set(target);
      placed.current = true;
    } else {
      x.set(animateTo(target));
    }
  }, [index, segment, x, options.length, rtl]);

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

/** Mirror a directional icon (chevrons, arrows) in right-to-left layouts. */
export const flipInRTL = () => (isRTL() ? { transform: [{ scaleX: -1 }] } : undefined);
