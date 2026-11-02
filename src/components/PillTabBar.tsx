import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { animateTo } from './motion';
import { useLanguage } from '@/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { maxContentWidth, radius, spacing } from '@/constants/theme';
import { makeStyles, useTheme } from '@/hooks/useTheme';

const BAR_HEIGHT = 58;
const PILL_INSET = 6;

/** Bottom tab bar with a highlight pill that slides to the selected tab. */
export function PillTabBar({ state, descriptors, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);
  const tabWidth = width / state.routes.length;
  const x = useSharedValue(0);
  const placed = useRef(false);
  // Subscribe so the pill repositions when the saved language finishes loading or changes.
  const rtl = useLanguage((s) => s.lang) === 'ar';

  useEffect(() => {
    if (tabWidth <= 0) return;
    // Right-to-left layouts put the first tab on the right.
    const target = (rtl ? state.routes.length - 1 - state.index : state.index) * tabWidth;
    if (!placed.current) {
      // First layout: put the pill in place without animating from the left edge.
      x.set(target);
      placed.current = true;
    } else {
      x.set(animateTo(target));
    }
  }, [state.index, state.routes.length, tabWidth, x, rtl]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.inner} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? <Animated.View style={[styles.pill, { width: tabWidth - PILL_INSET * 2 }, pillStyle]} /> : null}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]!;
          const focused = state.index === index;
          const color = focused ? colors.accent : colors.muted;
          const label = typeof options.title === 'string' ? options.title : route.name;

          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={styles.tab}
            >
              {options.tabBarIcon?.({ focused, color, size: 22 })}
              <Text style={[styles.label, { color }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  bar: {
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  inner: {
    flexDirection: 'row',
    height: BAR_HEIGHT,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  pill: {
    position: 'absolute',
    top: PILL_INSET,
    bottom: PILL_INSET,
    left: PILL_INSET,
    borderRadius: radius.pill,
    backgroundColor: colors.accentTint,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: 11, fontWeight: '700' },
}));
