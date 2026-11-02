import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActiveWorkoutBanner } from '@/components/ActiveWorkoutBanner';
import { Button, Card, EmptyState, ErrorText, Loading, Row, Screen, Txt } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useRoutines } from '@/hooks/queries';
import { useDialog } from '@/components/Dialog';
import { routineToPrefill } from '@/lib/prefill';
import { useActiveWorkout, type Prefill } from '@/store/activeWorkout';

export default function WorkoutTab() {
  const routines = useRoutines();
  const active = useActiveWorkout((s) => s.workout);
  const start = useActiveWorkout((s) => s.start);
  const { confirm, dialog } = useDialog();

  const begin = async (prefill?: Prefill) => {
    if (active) {
      const ok = await confirm('Discard current workout?', 'You already have a workout in progress. Starting a new one will discard it.', 'Discard', true);
      if (!ok) {
        router.push('/workout/active');
        return;
      }
    }
    start(prefill);
    router.push('/workout/active');
  };

  return (
    <Screen scroll contentStyle={{ paddingTop: spacing.md, gap: spacing.lg }}>
      {dialog}
      <ActiveWorkoutBanner />

      <View style={{ gap: spacing.sm }}>
        <Txt variant="label">Quick start</Txt>
        <Button title="Start Empty Workout" icon="add" onPress={() => begin()} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="label">Routines</Txt>
          <Button small variant="ghost" title="New routine" icon="add" onPress={() => router.push('/routine/new')} />
        </Row>

        {routines.isLoading ? <Loading /> : null}
        {routines.error ? <ErrorText>{routines.error.message}</ErrorText> : null}
        {routines.data?.length === 0 ? (
          <EmptyState
            icon="list-outline"
            title="No routines yet"
            subtitle="Save a routine to start the same workout again in one tap, or copy one from a friend's profile."
          />
        ) : null}

        {routines.data?.map((r) => (
          <Pressable key={r.id} onPress={() => router.push(`/routine/${r.id}`)} style={({ pressed }) => pressed && { opacity: 0.8 }}>
            <Card>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="h3" style={{ flex: 1 }} numberOfLines={1}>{r.title}</Txt>
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </Row>
              <Txt variant="muted" numberOfLines={2}>
                {r.routine_exercises.length === 0
                  ? 'No exercises'
                  : r.routine_exercises.map((re) => `${re.routine_sets.length} × ${re.exercise.name}`).join(', ')}
              </Txt>
              <Button small title="Start Routine" onPress={() => begin(routineToPrefill(r))} style={styles.startButton} />
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  startButton: { alignSelf: 'flex-start', marginTop: spacing.xs },
});
