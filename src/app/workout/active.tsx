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

export default function ActiveWorkoutScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const s = useActiveWorkout();
  const workout = s.workout;
  const finish = useFinishWorkout();
  const insets = useSafeAreaInsets();
  const [pickerOpen, setPickerOpen] = useState(false);
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

  const onDiscard = async () => {
    const ok = await confirm('Discard workout?', 'All sets from this workout will be lost.', 'Discard', true);
    if (ok) s.discard();
  };

  const onFinish = async () => {
    if (completedSets === 0) {
      notify('No completed sets', 'Tick at least one set before finishing, or discard the workout.');
      return;
    }
    const ok = await confirm('Finish workout?', `${completedSets} completed set${completedSets === 1 ? '' : 's'} will be saved.`, 'Finish');
    if (!ok) return;
    try {
      const id = await finish.mutateAsync(toFinishPayload(workout));
      leaving.current = true;
      router.replace(`/workout/${id}`);
      s.discard();
    } catch {
      // error shown below
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.topInner}>
          <Button small variant="danger" title="Discard" onPress={onDiscard} />
          <View style={{ alignItems: 'center' }}>
            <Txt variant="small">Duration</Txt>
            <Txt variant="h3" style={{ fontVariant: ['tabular-nums'] }}>{formatClock(elapsed)}</Txt>
          </View>
          <Button small variant="success" title="Finish" onPress={onFinish} loading={finish.isPending} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <TextInput
            value={workout.title}
            onChangeText={s.setTitle}
            style={styles.title}
            placeholder="Workout title"
            placeholderTextColor={colors.faint}
          />
          <TextInput
            value={workout.notes}
            onChangeText={s.setNotes}
            style={styles.notes}
            placeholder="Workout notes…"
            placeholderTextColor={colors.faint}
            multiline
          />
          {finish.error ? <ErrorText>{finish.error.message}</ErrorText> : null}

          {workout.exercises.length === 0 ? (
            <EmptyState icon="barbell-outline" title="Get started" subtitle="Add an exercise to start logging sets." />
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
                if (await confirm(`Remove ${e.name}?`, undefined, 'Remove', true)) s.removeExercise(e.id);
              }}
              onChangeNotes={(notes) => s.updateExercise(e.id, { notes })}
              onChangeRest={(restSeconds) => s.updateExercise(e.id, { restSeconds })}
              onChangeUnit={(unit) => s.updateExercise(e.id, { unit })}
            />
            </AnimatedItem>
          ))}

          <Button variant="secondary" title="Add Exercise" icon="add" onPress={() => setPickerOpen(true)} />
          <Row style={{ justifyContent: 'center' }}>
            <Txt variant="small">{completedSets} completed set{completedSets === 1 ? '' : 's'}</Txt>
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
