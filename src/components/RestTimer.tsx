import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing } from '@/constants/theme';
import { formatClock } from '@/lib/format';
import { useActiveWorkout } from '@/store/activeWorkout';
import { usePreferences } from '@/store/preferences';
import { enterCard, exitFade } from './motion';
import { Button, Row, Txt } from './ui';
import { makeStyles } from '@/hooks/useTheme';

/** Bottom bar with the rest countdown. Renders nothing when no rest is running. */
export function RestTimer() {
  const styles = useStyles();
  const restEndsAt = useActiveWorkout((s) => s.restEndsAt);
  const restTotal = useActiveWorkout((s) => s.restTotal);
  const adjustRest = useActiveWorkout((s) => s.adjustRest);
  const skipRest = useActiveWorkout((s) => s.skipRest);
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());
  const buzzed = useRef(false);
  // Fraction of the rest left (1 -> 0). Animated on the UI thread so the bar glides instead of ticking.
  const progress = useSharedValue(1);

  useEffect(() => {
    if (!restEndsAt || restTotal <= 0) {
      cancelAnimation(progress);
      return;
    }
    const remainingMs = Math.max(0, restEndsAt - Date.now());
    progress.set(Math.min(1, remainingMs / (restTotal * 1000)));
    progress.set(withTiming(0, { duration: remainingMs, easing: Easing.linear }));
    return () => cancelAnimation(progress);
  }, [restEndsAt, restTotal, progress]);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  useEffect(() => {
    if (!restEndsAt) return;
    buzzed.current = false;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [restEndsAt]);

  const remaining = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (!restEndsAt || remaining > 0 || buzzed.current) return;
    buzzed.current = true;
    if (Platform.OS !== 'web' && usePreferences.getState().haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const t = setTimeout(skipRest, 1500);
    return () => clearTimeout(t);
  }, [remaining, restEndsAt, skipRest]);

  if (!restEndsAt) return null;

  return (
    <Animated.View entering={enterCard(0)} exiting={exitFade} style={[styles.wrap, { paddingBottom: insets.bottom + spacing.sm }]}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, barStyle]} />
      </View>
      <Row style={{ justifyContent: 'space-between' }}>
        <Button small variant="secondary" title="-15s" onPress={() => adjustRest(-15)} />
        <View style={{ alignItems: 'center' }}>
          <Txt variant="small">{remaining === 0 ? 'Rest done' : 'Rest'}</Txt>
          <Txt variant="h2" style={{ fontVariant: ['tabular-nums'] }}>{formatClock(remaining)}</Txt>
        </View>
        <Button small variant="secondary" title="+15s" onPress={() => adjustRest(15)} />
        <Button small variant="ghost" title="Skip" onPress={skipRest} />
      </Row>
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  track: { height: 6, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.accent },
}));
