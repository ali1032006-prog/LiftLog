import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { WeightUnit } from '@/lib/units';

export type WorkoutPreferences = {
  /** Rest time for newly added exercises, in seconds (0 = off). */
  defaultRestSeconds: number;
  /** Unit for exercises you have never logged before. */
  defaultUnit: WeightUnit;
  /** Start the rest timer automatically when a set is ticked. */
  autoStartRest: boolean;
  /** Vibrate when the rest timer finishes and when sets are ticked (phones only). */
  haptics: boolean;
  /** Keep the screen on while a workout is in progress. */
  keepAwake: boolean;
};

type Store = WorkoutPreferences & { set: (patch: Partial<WorkoutPreferences>) => void };

/** Workout preferences, stored per device. */
export const usePreferences = create<Store>()(
  persist(
    (set) => ({
      defaultRestSeconds: 90,
      defaultUnit: 'kg',
      autoStartRest: true,
      haptics: true,
      keepAwake: true,
      set: (patch) => set(patch),
    }),
    { name: 'liftlog.preferences.v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
