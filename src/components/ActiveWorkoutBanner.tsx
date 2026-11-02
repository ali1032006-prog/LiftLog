import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { radius, spacing } from '@/constants/theme';
import { formatClock } from '@/lib/format';
import { useActiveWorkout } from '@/store/activeWorkout';
import { Txt } from './ui';
import { makeStyles, useTheme } from '@/hooks/useTheme';

/** "Workout in progress" strip shown on tabs while a workout is active. */
export function ActiveWorkoutBanner() {
  const { colors } = useTheme();
  const styles = useStyles();
  const workout = useActiveWorkout((s) => s.workout);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!workout) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [workout]);
  if (!workout) return null;
  const elapsed = (now - new Date(workout.startedAt).getTime()) / 1000;
  return (
    <Pressable onPress={() => router.push('/workout/active')} style={({ pressed }) => [styles.banner, pressed && { opacity: 0.8 }]}>
      <Ionicons name="play-circle" size={24} color={colors.accentText} />
      <View style={{ flex: 1 }}>
        <Txt style={{ color: colors.accentText, fontWeight: '700' }}>{workout.title}</Txt>
        <Txt variant="small" style={{ color: 'rgba(255,255,255,0.8)' }}>Workout in progress · {formatClock(elapsed)}</Txt>
      </View>
      <Txt style={{ color: colors.accentText, fontWeight: '700' }}>Resume</Txt>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.accent, borderRadius: radius.pill, padding: spacing.md, marginBottom: spacing.md,
  },
}));
