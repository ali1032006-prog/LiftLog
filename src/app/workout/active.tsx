import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExerciseBlock } from '@/components/ExerciseBlock';
import { ExercisePicker } from '@/components/ExercisePicker';
import { RestTimer } from '@/components/RestTimer';
import { Button, EmptyState, ErrorText, Row, Txt } from '@/components/ui';
import { maxContentWidth, spacing } from '@/constants/theme';
import { useFinishWorkout } from '@/hooks/queries';
import { useDialog } from '@/components/Dialog';
import { formatClock } from '@/lib/format';
import { toFinishPayload, useActiveWorkout } from '@/store/activeWorkout';
import { usePreferences } from '@/store/preferences';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { AnimatedItem } from '@/components/motion';
import { PhotoStrip } from '@/components/PhotoStrip';
import { useAuth } from '@/hooks/useAuth';
import { pickImage, uploadPhoto } from '@/lib/photos';
import { t, tn } from '@/i18n';

export default function ActiveWorkoutScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const s = useActiveWorkout();
  const workout = s.workout;
  const finish = useFinishWorkout();
  const insets = useSafeAreaInsets();
  const [pickerOpen, setPickerOpen] = useState(false);
  const { session } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const leaving = useRef(false);
  const { confirm, notify, dialog } = useDialog();

  const keepAwake = usePreferences((p) => p.keepAwake);
  const haptics = usePreferences((p) => p.haptics);

  // Keep the screen on during a workout when the preference is enabled.
  useEffect(() => {
    if (!keepAwake) return;
    activateKeepAwakeAsync('active-workout').catch(() => {});
    return () => {
      deactivateKeepAwake('active-workout').catch(() => {});
    };
  }, [keepAwake]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Workout was discarded/finished elsewhere: leave the screen.
  useEffect(() => {
    if (workout || leaving.current) return;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/workout');
  }, [workout]);

  if (!workout) return null;

  const elapsed = (now - new Date(workout.startedAt).getTime()) / 1000;
  const completedSets = workout.exercises.reduce((n, e) => n + e.sets.filter((x) => x.completed).length, 0);

  const onAddPhoto = async () => {
    if (!session) return;
    try {
      const image = await pickImage();
      if (!image) return;
      setUploading(true);
      const path = await uploadPhoto('workout-photos', session.user.id, image, 1600);
      s.addPhoto(path);
    } catch (e) {
      await notify(t('Could not add photo'), e instanceof Error ? e.message : undefined);
    } finally {
      setUploading(false);
    }
  };

  const onDiscard = async () => {
    const ok = await confirm(t('Discard workout?'), t('All sets from this workout will be lost.'), t('Discard'), true);
    if (ok) s.discard();
  };

  const onFinish = async () => {
    if (completedSets === 0) {
      notify(t('No completed sets'), t('Tick at least one set before finishing, or discard the workout.'));
      return;
    }
    const ok = await confirm(t('Finish workout?'), tn(completedSets, '{count} completed set will be saved.', '{count} completed sets will be saved.'), t('Finish'));
    if (!ok) return;
    try {
      const id = await finish.mutateAsync(toFinishPayload(workout));
      leaving.current = true;
      router.replace(`/workout/${id}`);
      s.clear();
    } catch {
      // error shown below
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topInner}>
          <Button small variant="danger" title={t('Discard')} onPress={onDiscard} />
          <View style={{ alignItems: 'center' }}>
            <Txt variant="small">{t('Duration')}</Txt>
            <Txt variant="h3" style={{ fontVariant: ['tabular-nums'] }}>{formatClock(elapsed)}</Txt>
          </View>
          <Button small variant="success" title={t('Finish')} onPress={onFinish} loading={finish.isPending} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <TextInput
            value={workout.title}
            onChangeText={s.setTitle}
            style={styles.title}
            placeholder={t('Workout title')}
            placeholderTextColor={colors.faint}
          />
          <TextInput
            value={workout.notes}
            onChangeText={s.setNotes}
            style={styles.notes}
            placeholder={t('Workout notes…')}
            placeholderTextColor={colors.faint}
            multiline
          />
          <PhotoStrip paths={workout.photos ?? []} onAdd={onAddPhoto} onRemove={s.removePhoto} uploading={uploading} />
          {finish.error ? <ErrorText>{finish.error.message}</ErrorText> : null}

          {workout.exercises.length === 0 ? (
            <EmptyState icon="barbell-outline" title={t('Get started')} subtitle={t('Add an exercise to start logging sets.')} />
          ) : null}

          {workout.exercises.map((e, i) => (
            <AnimatedItem key={e.id} index={i}>
            <ExerciseBlock
              exercise={e}
              index={i}
              onToggleSet={(setId) => {
                if (haptics && Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                s.toggleSet(e.id, setId);
              }}
              onChangeSet={(setId, patch) => s.updateSet(e.id, setId, patch)}
              onAddSet={() => s.addSet(e.id)}
              onRemoveSet={(setId) => s.removeSet(e.id, setId)}
              onRemove={async () => {
                if (await confirm(t('Remove {name}?', { name: e.name }), undefined, t('Remove'), true)) s.removeExercise(e.id);
              }}
              onChangeNotes={(notes) => s.updateExercise(e.id, { notes })}
              onChangeRest={(restSeconds) => s.updateExercise(e.id, { restSeconds })}
              onChangeUnit={(unit) => s.updateExercise(e.id, { unit })}
            />
            </AnimatedItem>
          ))}

          <Button variant="secondary" title={t('Add Exercise')} icon="add" onPress={() => setPickerOpen(true)} />
          <Row style={{ justifyContent: 'center' }}>
            <Txt variant="small">{tn(completedSets, '{count} completed set', '{count} completed sets')}</Txt>
          </Row>
        </View>
      </ScrollView>

      <RestTimer />
      {dialog}
      <ExercisePicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(name, unit) => s.addExercise(name, unit)} />
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingBottom: spacing.sm, paddingHorizontal: spacing.lg },
  topInner: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scroll: { flexGrow: 1, paddingBottom: 160 },
  content: { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center', padding: spacing.lg, gap: spacing.md },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  notes: { color: colors.muted, fontSize: 15, minHeight: 24 },
}));
