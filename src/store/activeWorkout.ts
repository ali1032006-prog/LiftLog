import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { WeightUnit } from '@/lib/units';
import { usePreferences } from './preferences';

export type ActiveSet = {
  id: string;
  weightKg: number | null;
  reps: number | null;
  completed: boolean;
};

export type ActiveExercise = {
  id: string;
  name: string;
  notes: string;
  restSeconds: number;
  unit: WeightUnit;
  sets: ActiveSet[];
};

export type ActiveWorkout = {
  title: string;
  notes: string;
  startedAt: string; // ISO
  routineId: string | null;
  exercises: ActiveExercise[];
};

export type Prefill = {
  title?: string;
  notes?: string | null;
  routineId?: string | null;
  exercises?: { name: string; notes?: string | null; restSeconds?: number; unit?: WeightUnit; sets?: { weightKg: number | null; reps: number | null }[] }[];
};

type State = {
  workout: ActiveWorkout | null;
  /** Epoch ms when the current rest ends, or null when no rest is running. */
  restEndsAt: number | null;
  restTotal: number;
  start: (prefill?: Prefill) => void;
  discard: () => void;
  setTitle: (title: string) => void;
  setNotes: (notes: string) => void;
  addExercise: (name: string, unit?: WeightUnit) => void;
  removeExercise: (exerciseId: string) => void;
  updateExercise: (exerciseId: string, patch: Partial<Pick<ActiveExercise, 'notes' | 'restSeconds' | 'name' | 'unit'>>) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  updateSet: (exerciseId: string, setId: string, patch: Partial<Pick<ActiveSet, 'weightKg' | 'reps'>>) => void;
  toggleSet: (exerciseId: string, setId: string) => void;
  startRest: (seconds: number) => void;
  adjustRest: (deltaSeconds: number) => void;
  skipRest: () => void;
};

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

function newSet(prev?: ActiveSet): ActiveSet {
  return { id: uid(), weightKg: prev?.weightKg ?? null, reps: prev?.reps ?? null, completed: false };
}

export const useActiveWorkout = create<State>()(
  persist(
    (set, get) => ({
      workout: null,
      restEndsAt: null,
      restTotal: 0,

      start: (prefill) =>
        set({
          restEndsAt: null,
          workout: {
            title: prefill?.title?.trim() || defaultTitle(),
            notes: prefill?.notes ?? '',
            startedAt: new Date().toISOString(),
            routineId: prefill?.routineId ?? null,
            exercises: (prefill?.exercises ?? []).map((e) => ({
              id: uid(),
              name: e.name,
              notes: e.notes ?? '',
              restSeconds: e.restSeconds ?? 90,
              unit: e.unit ?? 'kg',
              sets: (e.sets && e.sets.length > 0 ? e.sets : [{ weightKg: null, reps: null }]).map((s) => ({
                id: uid(),
                weightKg: s.weightKg,
                reps: s.reps,
                completed: false,
              })),
            })),
          },
        }),

      discard: () => set({ workout: null, restEndsAt: null }),

      setTitle: (title) => mutate(set, get, (w) => ({ ...w, title })),
      setNotes: (notes) => mutate(set, get, (w) => ({ ...w, notes })),

      addExercise: (name, unit = usePreferences.getState().defaultUnit) =>
        mutate(set, get, (w) => ({
          ...w,
          exercises: [...w.exercises, { id: uid(), name: name.trim(), notes: '', restSeconds: usePreferences.getState().defaultRestSeconds, unit, sets: [newSet()] }],
        })),

      removeExercise: (exerciseId) =>
        mutate(set, get, (w) => ({ ...w, exercises: w.exercises.filter((e) => e.id !== exerciseId) })),

      updateExercise: (exerciseId, patch) =>
        mutate(set, get, (w) => ({
          ...w,
          exercises: w.exercises.map((e) => (e.id === exerciseId ? { ...e, ...patch } : e)),
        })),

      addSet: (exerciseId) =>
        mutate(set, get, (w) => ({
          ...w,
          exercises: w.exercises.map((e) =>
            e.id === exerciseId ? { ...e, sets: [...e.sets, newSet(e.sets[e.sets.length - 1])] } : e,
          ),
        })),

      removeSet: (exerciseId, setId) =>
        mutate(set, get, (w) => ({
          ...w,
          exercises: w.exercises.map((e) =>
            e.id === exerciseId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e,
          ),
        })),

      updateSet: (exerciseId, setId, patch) =>
        mutate(set, get, (w) => ({
          ...w,
          exercises: w.exercises.map((e) =>
            e.id === exerciseId ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) } : e,
          ),
        })),

      toggleSet: (exerciseId, setId) => {
        const w = get().workout;
        if (!w) return;
        const ex = w.exercises.find((e) => e.id === exerciseId);
        const s = ex?.sets.find((x) => x.id === setId);
        if (!ex || !s) return;
        const nowCompleted = !s.completed;
        set({
          workout: {
            ...w,
            exercises: w.exercises.map((e) =>
              e.id === exerciseId
                ? { ...e, sets: e.sets.map((x) => (x.id === setId ? { ...x, completed: nowCompleted } : x)) }
                : e,
            ),
          },
        });
        if (nowCompleted && ex.restSeconds > 0 && usePreferences.getState().autoStartRest) get().startRest(ex.restSeconds);
      },

      startRest: (seconds) => set({ restEndsAt: Date.now() + seconds * 1000, restTotal: seconds }),
      adjustRest: (delta) => {
        const ends = get().restEndsAt;
        if (!ends) return;
        set({ restEndsAt: Math.max(Date.now(), ends + delta * 1000), restTotal: Math.max(0, get().restTotal + delta) });
      },
      skipRest: () => set({ restEndsAt: null }),
    }),
    {
      name: 'liftlog.activeWorkout.v1',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      // v1 workouts had no per-exercise unit
      migrate: (state) => {
        const s = state as { workout?: ActiveWorkout | null };
        if (s.workout) s.workout.exercises = s.workout.exercises.map((e) => ({ ...e, unit: e.unit ?? 'kg' }));
        return s as never;
      },
      partialize: (s) => ({ workout: s.workout, restEndsAt: s.restEndsAt, restTotal: s.restTotal }),
    },
  ),
);

function mutate(
  set: (partial: Partial<State>) => void,
  get: () => State,
  fn: (w: ActiveWorkout) => ActiveWorkout,
) {
  const w = get().workout;
  if (!w) return;
  set({ workout: fn(w) });
}

function defaultTitle(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Morning Workout';
  if (h < 17) return 'Afternoon Workout';
  return 'Evening Workout';
}

/** Shape expected by the finish_workout RPC. */
export function toFinishPayload(w: ActiveWorkout, finishedAt = new Date()) {
  const started = new Date(w.startedAt);
  return {
    title: w.title,
    notes: w.notes,
    started_at: started.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_seconds: Math.max(0, Math.round((finishedAt.getTime() - started.getTime()) / 1000)),
    exercises: w.exercises
      .filter((e) => e.name.trim().length > 0)
      .map((e) => ({
        name: e.name.trim(),
        notes: e.notes,
        rest_seconds: e.restSeconds,
        weight_unit: e.unit ?? 'kg',
        sets: e.sets
          .filter((s) => s.completed)
          .map((s) => ({ weight_kg: s.weightKg, reps: s.reps, completed: true })),
      }))
      .filter((e) => e.sets.length > 0),
  };
}
