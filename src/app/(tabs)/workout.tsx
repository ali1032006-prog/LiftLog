import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { AnimatedItem, PressableScale } from '@/components/motion';
import { ActiveWorkoutBanner } from '@/components/ActiveWorkoutBanner';
import { Button, Card, EmptyState, ErrorText, Loading, Row, Screen, Txt } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useRoutines } from '@/hooks/queries';
import { useDialog } from '@/components/Dialog';
import { routineToPrefill } from '@/lib/prefill';
import { MAX_ROUTINES } from '@/lib/units';
import { useActiveWorkout, type Prefill } from '@/store/activeWorkout';
import { makeStyles, useTheme } from '@/hooks/useTheme';

export default function WorkoutTab() {
  const { colors } = useTheme();
  const styles = useStyles();
  const routines = useRoutines();
  const active = useActiveWorkout((s) => s.workout);
  const start = useActiveWorkout((s) => s.start);
  const { confirm, dialog } = useDialog();
  const atLimit = (routines.data?.length ?? 0) >= MAX_ROUTINES;

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
          <Txt variant="label">Routines ({routines.data?.length ?? 0}/{MAX_ROUTINES})</Txt>
          <Button
            small
            variant="ghost"
            title="New routine"
            icon="add"
            disabled={atLimit}
            onPress={() => router.push('/routine/new')}
          />
        </Row>

        {atLimit ? (
          <Txt variant="small">You have {MAX_ROUTINES} routines, the maximum. Delete one to save another.</Txt>
        ) : null}
        {routines.isLoading ? <Loading /> : null}
        {routines.error ? <ErrorText>{routines.error.message}</ErrorText> : null}
        {routines.data?.length === 0 ? (
          <EmptyState
            icon="list-outline"
            title="No routines yet"
            subtitle="Save a routine to start the same workout again in one tap, or copy one from a friend's profile."
          />
        ) : null}

        {routines.data?.map((r, i) => (
          <AnimatedItem key={r.id} index={i}>
          <PressableScale onPress={() => router.push(`/routine/${r.id}`)} pressedScale={0.98} accessibilityRole="button">
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
          </PressableScale>
          </AnimatedItem>
        ))}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((colors) => ({
  startButton: { alignSelf: 'flex-start', marginTop: spacing.xs },
}));
