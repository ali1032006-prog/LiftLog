import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, ErrorText, Loading, Row, Screen, Txt } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useCopyWorkout, useDeleteWorkout, useWorkout } from '@/hooks/queries';
import { useAuth } from '@/hooks/useAuth';
import { useDialog } from '@/components/Dialog';
import { formatDate, formatDuration } from '@/lib/format';
import { workoutToPrefill } from '@/lib/prefill';
import { formatVolume, formatWeight } from '@/lib/units';
import { useActiveWorkout } from '@/store/activeWorkout';
import { makeStyles, useTheme } from '@/hooks/useTheme';

export default function WorkoutDetailScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, unit } = useAuth();
  const { data: w, isLoading, error } = useWorkout(id);
  const copy = useCopyWorkout();
  const del = useDeleteWorkout();
  const active = useActiveWorkout((s) => s.workout);
  const start = useActiveWorkout((s) => s.start);
  const { confirm, notify, dialog } = useDialog();

  if (isLoading) return <Loading />;
  if (error || !w) return <Screen><ErrorText>{error?.message ?? 'Workout not found'}</ErrorText></Screen>;

  const isMine = w.user_id === session?.user.id;
  const volume = w.workout_exercises.reduce(
    (sum, we) => sum + we.sets.reduce((s2, s) => s2 + (s.completed ? (s.weight_kg ?? 0) * (s.reps ?? 0) : 0), 0),
    0,
  );
  const setCount = w.workout_exercises.reduce((n, we) => n + we.sets.filter((s) => s.completed).length, 0);

  const onCopy = async () => {
    try {
      await copy.mutateAsync(w.id);
      notify('Saved as routine', 'Find it in the Workout tab under Routines.');
    } catch {
      /* shown below */
    }
  };

  const onStart = async () => {
    if (active) {
      const ok = await confirm('Discard current workout?', 'You already have a workout in progress.', 'Discard', true);
      if (!ok) return;
    }
    start(workoutToPrefill(w));
    router.push('/workout/active');
  };

  const onDelete = async () => {
    if (!(await confirm('Delete workout?', 'This cannot be undone.', 'Delete', true))) return;
    await del.mutateAsync(w.id);
    router.back();
  };

  return (
    <Screen scroll contentStyle={{ paddingVertical: spacing.lg, gap: spacing.lg }}>
      <Stack.Screen options={{ title: w.title }} />
      {dialog}
      <Pressable onPress={() => (isMine ? router.push('/(tabs)/account') : router.push(`/user/${w.user_id}`))}>
        <Row>
          <Avatar name={w.profile.display_name || w.profile.username} url={w.profile.avatar_url} size={40} />
          <View style={{ flex: 1 }}>
            <Txt variant="h3">{w.profile.display_name || w.profile.username}</Txt>
            <Txt variant="small">@{w.profile.username} · {formatDate(w.started_at)}</Txt>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.faint} />
        </Row>
      </Pressable>

      <View>
        <Txt variant="title">{w.title}</Txt>
        {w.notes ? <Txt variant="muted" style={{ marginTop: spacing.xs }}>{w.notes}</Txt> : null}
      </View>

      <Row style={{ justifyContent: 'space-between' }}>
        <StatBox label="Duration" value={formatDuration(w.duration_seconds)} />
        <StatBox label="Volume" value={formatVolume(volume, unit)} />
        <StatBox label="Sets" value={String(setCount)} />
      </Row>

      <Row style={{ gap: spacing.sm }}>
        <Button title="Save as routine" icon="copy-outline" variant="secondary" onPress={onCopy} loading={copy.isPending} style={{ flex: 1 }} />
        <Button title="Start workout" icon="play" onPress={onStart} style={{ flex: 1 }} />
      </Row>
      {copy.error ? <ErrorText>{copy.error.message}</ErrorText> : null}

      {w.workout_exercises.map((we, i) => (
        <Card key={we.id}>
          <Txt variant="h3">{i + 1}. {we.exercise.name}</Txt>
          {we.notes ? <Txt variant="muted">{we.notes}</Txt> : null}
          <Row style={styles.setHeader}>
            <Txt variant="label" style={styles.colSet}>Set</Txt>
            <Txt variant="label" style={styles.col}>Weight</Txt>
            <Txt variant="label" style={styles.col}>Reps</Txt>
          </Row>
          {we.sets.map((s, j) => (
            <Row key={s.id} style={{ paddingVertical: 3 }}>
              <Txt style={[styles.colSet, { color: colors.muted }]}>{j + 1}</Txt>
              <Txt style={styles.col}>{formatWeight(s.weight_kg, unit)}</Txt>
              <Txt style={styles.col}>{s.reps ?? '–'}</Txt>
            </Row>
          ))}
        </Card>
      ))}

      {isMine ? (
        <Button variant="danger" title="Delete workout" icon="trash-outline" onPress={onDelete} loading={del.isPending} />
      ) : null}
      {del.error ? <ErrorText>{del.error.message}</ErrorText> : null}
    </Screen>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.md, gap: 2 }}>
      <Txt variant="h3">{value}</Txt>
      <Txt variant="small">{label}</Txt>
    </Card>
  );
}

const useStyles = makeStyles((colors) => ({
  setHeader: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: 4 },
  colSet: { width: 40 },
  col: { flex: 1 },
}));
