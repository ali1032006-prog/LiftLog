import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'system' | 'light' | 'dark';

/** Appearance choice, stored per device. */
export const useThemePreference = create<{ mode: ThemeMode; setMode: (m: ThemeMode) => void }>()(
  persist(
    (set) => ({ mode: 'system', setMode: (mode) => set({ mode }) }),
    { name: 'liftlog.theme.v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
