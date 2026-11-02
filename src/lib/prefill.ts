import type { RoutineDetail, WorkoutDetail } from './types';
import type { Prefill } from '@/store/activeWorkout';

export function routineToPrefill(r: RoutineDetail): Prefill {
  return {
    title: r.title,
    notes: r.notes,
    routineId: r.id,
    exercises: r.routine_exercises.map((re) => ({
      name: re.exercise.name,
      notes: re.notes,
      restSeconds: re.rest_seconds,
      sets: re.routine_sets.map((s) => ({ weightKg: s.weight_kg, reps: s.reps })),
    })),
  };
}

export function workoutToPrefill(w: WorkoutDetail): Prefill {
  return {
    title: w.title,
    notes: w.notes,
    exercises: w.workout_exercises.map((we) => ({
      name: we.exercise.name,
      notes: we.notes,
      restSeconds: we.rest_seconds,
      sets: we.sets.map((s) => ({ weightKg: s.weight_kg, reps: s.reps })),
    })),
  };
}
