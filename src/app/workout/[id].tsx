import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, ErrorText, Loading, Row, Screen, Txt } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAddWorkoutPhoto, useCopyWorkout, useDeleteWorkout, usePremium, useRemoveWorkoutPhoto, useRoutines, useWorkout } from '@/hooks/queries';
import { PhotoStrip } from '@/components/PhotoStrip';
import { ExerciseAnimation } from '@/components/ExerciseAnimation';
import { flipInRTL } from '@/components/motion';
import { pickImage, uploadPhoto } from '@/lib/photos';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDialog } from '@/components/Dialog';
import { formatDate, formatDuration } from '@/lib/format';
import { workoutToPrefill } from '@/lib/prefill';
import { asUnit, formatVolume, formatWeight } from '@/lib/units';
import { FREE_ROUTINE_LIMIT, usePaywall } from '@/lib/premium';
import { useActiveWorkout } from '@/store/activeWorkout';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { t } from '@/i18n';

export default function WorkoutDetailScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { data: w, isLoading, error } = useWorkout(id);
  const copy = useCopyWorkout();
  const routines = useRoutines();
  const del = useDeleteWorkout();
  const addPhoto = useAddWorkoutPhoto(id ?? '', session?.user.id);
  const removePhoto = useRemoveWorkoutPhoto(id ?? '');
  const [uploading, setUploading] = useState(false);
  const active = useActiveWorkout((s) => s.workout);
  const start = useActiveWorkout((s) => s.start);
  const { confirm, notify, dialog } = useDialog();
  const { isPremium } = usePremium();
  const openPaywall = usePaywall((s) => s.open);
  const routinesFull = !isPremium && (routines.data?.length ?? 0) >= FREE_ROUTINE_LIMIT;

  if (isLoading) return <Loading />;
  if (error || !w) return <Screen><ErrorText>{error?.message ?? t('Workout not found')}</ErrorText></Screen>;

  const isMine = w.user_id === session?.user.id;
  const volume = w.workout_exercises.reduce(
    (sum, we) => sum + we.sets.reduce((s2, s) => s2 + (s.completed ? (s.weight_kg ?? 0) * (s.reps ?? 0) : 0), 0),
    0,
  );
  // Show total volume in the unit used by most exercises in this workout.
  const lbCount = w.workout_exercises.filter((we) => we.weight_unit === 'lb').length;
  const volumeUnit = lbCount > w.workout_exercises.length - lbCount ? 'lb' : 'kg';
  const setCount = w.workout_exercises.reduce((n, we) => n + we.sets.filter((s) => s.completed).length, 0);

  const onCopy = async () => {
    try {
      await copy.mutateAsync(w.id);
      notify(t('Saved as routine'), t('Find it in the Workout tab under Routines.'));
    } catch {
      /* shown below */
    }
  };

  const onStart = async () => {
    if (active) {
      const ok = await confirm(t('Discard current workout?'), t('You already have a workout in progress.'), t('Discard'), true);
      if (!ok) return;
    }
    start(workoutToPrefill(w));
    router.push('/workout/active');
  };

  const onAddPhoto = async () => {
    if (!session) return;
    try {
      const image = await pickImage();
      if (!image) return;
      setUploading(true);
      const path = await uploadPhoto('workout-photos', session.user.id, image, 1600);
      await addPhoto.mutateAsync({ path, position: w.workout_photos.length + 1 });
    } catch (e) {
      await notify(t('Could not add photo'), e instanceof Error ? e.message : undefined);
    } finally {
      setUploading(false);
    }
  };

  const onRemovePhoto = async (path: string) => {
    const photo = w.workout_photos.find((p) => p.path === path);
    if (!photo) return;
    if (await confirm(t('Remove this photo?'), undefined, t('Remove'), true)) removePhoto.mutate({ id: photo.id, path });
  };

  const onDelete = async () => {
    if (!(await confirm(t('Delete workout?'), t('This cannot be undone.'), t('Delete'), true))) return;
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
          <Ionicons name="chevron-forward" size={18} color={colors.faint} style={flipInRTL()} />
        </Row>
      </Pressable>

      {w.workout_photos.length > 0 || isMine ? (
        <PhotoStrip
          size={140}
          paths={w.workout_photos.map((p) => p.path)}
          uploading={uploading}
          onAdd={isMine ? onAddPhoto : undefined}
          onRemove={isMine ? onRemovePhoto : undefined}
        />
      ) : null}

      <View>
        <Txt variant="title">{w.title}</Txt>
        {w.notes ? <Txt variant="muted" style={{ marginTop: spacing.xs }}>{w.notes}</Txt> : null}
      </View>

      <Row style={{ justifyContent: 'space-between' }}>
        <StatBox label={t('Duration')} value={formatDuration(w.duration_seconds)} />
        <StatBox label={t('Volume')} value={formatVolume(volume, volumeUnit)} />
        <StatBox label={t('Sets')} value={String(setCount)} />
      </Row>

      <Row style={{ gap: spacing.sm }}>
        <Button
          title={t('Save as routine')}
          icon={routinesFull ? 'lock-closed' : 'copy-outline'}
          variant="secondary"
          onPress={routinesFull ? () => openPaywall('routines') : onCopy}
          loading={copy.isPending}
          style={{ flex: 1 }}
        />
        <Button title={t('Start workout')} icon="play" onPress={onStart} style={{ flex: 1 }} />
      </Row>
      {routinesFull ? (
        <Txt variant="small">
          {t('The free plan saves up to {max} routines. Delete one, or go Premium for unlimited routines.', { max: FREE_ROUTINE_LIMIT })}
        </Txt>
      ) : null}
      {copy.error ? <ErrorText>{copy.error.message}</ErrorText> : null}

      {w.workout_exercises.map((we, i) => (
        <Card key={we.id}>
          <Row>
            <ExerciseAnimation name={we.exercise.name} size={44} expandable photoPaths={we.exercise.photo_paths} editable={isMine} />
            <Txt variant="h3" style={{ flex: 1 }}>{i + 1}. {we.exercise.name}</Txt>
          </Row>
          {we.notes ? <Txt variant="muted">{we.notes}</Txt> : null}
          <Row style={styles.setHeader}>
            <Txt variant="label" style={styles.colSet}>{t('Set')}</Txt>
            <Txt variant="label" style={styles.col}>{t('Weight')}</Txt>
            <Txt variant="label" style={styles.col}>{t('Reps')}</Txt>
          </Row>
          {we.sets.map((s, j) => (
            <Row key={s.id} style={{ paddingVertical: 3 }}>
              <Txt style={[styles.colSet, { color: colors.muted }]}>{j + 1}</Txt>
              <Txt style={styles.col}>{formatWeight(s.weight_kg, asUnit(we.weight_unit))}</Txt>
              <Txt style={styles.col}>{s.reps ?? '–'}</Txt>
            </Row>
          ))}
        </Card>
      ))}

      {isMine ? (
        <Button variant="danger" title={t('Delete workout')} icon="trash-outline" onPress={onDelete} loading={del.isPending} />
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
