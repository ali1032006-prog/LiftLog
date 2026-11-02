import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing } from '@/constants/theme';
import { formatClock } from '@/lib/format';
import { useActiveWorkout } from '@/store/activeWorkout';
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

  useEffect(() => {
    if (!restEndsAt) return;
    buzzed.current = false;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [restEndsAt]);

  const remaining = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (!restEndsAt || remaining > 0 || buzzed.current) return;
    buzzed.current = true;
    if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const t = setTimeout(skipRest, 1500);
    return () => clearTimeout(t);
  }, [remaining, restEndsAt, skipRest]);

  if (!restEndsAt) return null;
  const progress = restTotal > 0 ? Math.min(1, remaining / restTotal) : 0;

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + spacing.sm }]}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
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
    </View>
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
  track: { height: 4, backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 4, backgroundColor: colors.accent },
}));
