import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';
import { ExerciseBlock, type EditableExercise } from '@/components/ExerciseBlock';
import { ExercisePicker } from '@/components/ExercisePicker';
import { Button, EmptyState, ErrorText, Loading, Row, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useDeleteRoutine, useRoutine, useSaveRoutine } from '@/hooks/queries';
import { asUnit } from '@/lib/units';
import { useDialog } from '@/components/Dialog';
import type { RoutineDetail } from '@/lib/types';
import { uid, useActiveWorkout } from '@/store/activeWorkout';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { AnimatedItem } from '@/components/motion';

function fromRoutine(r: RoutineDetail): EditableExercise[] {
  return r.routine_exercises.map((re) => ({
    id: re.id,
    name: re.exercise.name,
    notes: re.notes ?? '',
    restSeconds: re.rest_seconds,
    unit: asUnit(re.weight_unit),
    sets: re.routine_sets.map((s) => ({ id: s.id, weightKg: s.weight_kg, reps: s.reps })),
  }));
}

export default function RoutineEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const routine = useRoutine(isNew ? undefined : id);

  if (!isNew && routine.isLoading) return <Loading />;
  if (routine.error) return <Screen><ErrorText>{routine.error.message}</ErrorText></Screen>;
  if (!isNew && !routine.data) return <Loading />;

  // Key on the routine id so a different routine remounts the editor with fresh state.
  return <RoutineEditor key={id} id={id} isNew={isNew} initial={routine.data} />;
}

function RoutineEditor({ id, isNew, initial }: { id: string; isNew: boolean; initial: RoutineDetail | undefined }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const save = useSaveRoutine();
  const del = useDeleteRoutine();
  const active = useActiveWorkout((s) => s.workout);
  const start = useActiveWorkout((s) => s.start);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [exercises, setExercises] = useState<EditableExercise[]>(() => (initial ? fromRoutine(initial) : []));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { confirm, dialog } = useDialog();

  const edit = (fn: (prev: EditableExercise[]) => EditableExercise[]) => {
    setExercises(fn);
    setDirty(true);
  };

  const payload = () => ({
    ...(isNew ? {} : { id }),
    title: title.trim() || 'Routine',
    notes,
    exercises: exercises.map((e) => ({
      name: e.name,
      notes: e.notes,
      rest_seconds: e.restSeconds,
      weight_unit: e.unit,
      sets: e.sets.map((s) => ({ weight_kg: s.weightKg, reps: s.reps })),
    })),
  });

  const onSave = async () => {
    try {
      const savedId = await save.mutateAsync(payload());
      setDirty(false);
      if (isNew) router.replace(`/routine/${savedId}`);
      else router.back();
    } catch {
      /* shown below */
    }
  };

  const onStart = async () => {
    if (active) {
      const ok = await confirm('Discard current workout?', 'You already have a workout in progress.', 'Discard', true);
      if (!ok) return;
    }
    start({
      title: title.trim() || 'Routine',
      notes,
      routineId: isNew ? null : id,
      exercises: exercises.map((e) => ({ name: e.name, notes: e.notes, restSeconds: e.restSeconds, unit: e.unit, sets: e.sets })),
    });
    router.push('/workout/active');
  };

  const onDelete = async () => {
    if (!(await confirm('Delete routine?', undefined, 'Delete', true))) return;
    await del.mutateAsync(id);
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      {dialog}
      <Stack.Screen
        options={{
          title: isNew ? 'New routine' : 'Edit routine',
          headerRight: () => (
            <Button small variant="ghost" title={save.isPending ? 'Saving…' : 'Save'} onPress={onSave} disabled={save.isPending || (!dirty && !isNew)} />
          ),
        }}
      />
      <Screen scroll contentStyle={{ paddingVertical: spacing.lg, gap: spacing.md }}>
        <TextInput
          value={title}
          onChangeText={(t) => { setTitle(t); setDirty(true); }}
          style={styles.title}
          placeholder="Routine title"
          placeholderTextColor={colors.faint}
        />
        <TextInput
          value={notes}
          onChangeText={(t) => { setNotes(t); setDirty(true); }}
          style={styles.notes}
          placeholder="Notes…"
          placeholderTextColor={colors.faint}
          multiline
        />
        {save.error ? <ErrorText>{save.error.message}</ErrorText> : null}

        {exercises.length === 0 ? (
          <EmptyState icon="list-outline" title="No exercises" subtitle="Add exercises and the sets you plan to do." />
        ) : null}

        {exercises.map((e, i) => (
          <AnimatedItem key={e.id} index={i}>
          <ExerciseBlock
            exercise={e}
            index={i}
            onChangeSet={(setId, patch) =>
              edit((prev) => prev.map((x) => (x.id === e.id ? { ...x, sets: x.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) } : x)))
            }
            onAddSet={() =>
              edit((prev) =>
                prev.map((x) => {
                  if (x.id !== e.id) return x;
                  const last = x.sets[x.sets.length - 1];
                  return { ...x, sets: [...x.sets, { id: uid(), weightKg: last?.weightKg ?? null, reps: last?.reps ?? null }] };
                }),
              )
            }
            onRemoveSet={(setId) => edit((prev) => prev.map((x) => (x.id === e.id ? { ...x, sets: x.sets.filter((s) => s.id !== setId) } : x)))}
            onRemove={() => edit((prev) => prev.filter((x) => x.id !== e.id))}
            onChangeNotes={(n) => edit((prev) => prev.map((x) => (x.id === e.id ? { ...x, notes: n } : x)))}
            onChangeRest={(r) => edit((prev) => prev.map((x) => (x.id === e.id ? { ...x, restSeconds: r } : x)))}
            onChangeUnit={(u) => edit((prev) => prev.map((x) => (x.id === e.id ? { ...x, unit: u } : x)))}
          />
          </AnimatedItem>
        ))}

        <Button variant="secondary" title="Add Exercise" icon="add" onPress={() => setPickerOpen(true)} />

        <Row style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button title="Save" onPress={onSave} loading={save.isPending} style={{ flex: 1 }} />
          <Button title="Start Routine" icon="play" variant="success" onPress={onStart} disabled={exercises.length === 0} style={{ flex: 1 }} />
        </Row>
        {!isNew ? (
          <View style={{ marginTop: spacing.lg }}>
            <Button variant="danger" title="Delete routine" icon="trash-outline" onPress={onDelete} loading={del.isPending} />
          </View>
        ) : null}
      </Screen>
      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(name, unit) => edit((prev) => [...prev, { id: uid(), name, notes: '', restSeconds: 90, unit, sets: [{ id: uid(), weightKg: null, reps: null }] }])}
      />
    </KeyboardAvoidingView>
  );
}

const useStyles = makeStyles((colors) => ({
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  notes: { color: colors.muted, fontSize: 15, minHeight: 24 },
}));
