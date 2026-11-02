import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Json, ProfileStats, ProfileSummaryRow, RoutineDetail, Tables, WorkoutCard, WorkoutDetail } from '@/lib/types';

const PAGE = 20;

export const keys = {
  feed: ['feed'] as const,
  profile: (id: string) => ['profile', id] as const,
  userWorkouts: (id: string) => ['userWorkouts', id] as const,
  workout: (id: string) => ['workout', id] as const,
  routines: ['routines'] as const,
  routine: (id: string) => ['routine', id] as const,
  exercises: ['exercises'] as const,
  search: (q: string) => ['search', q] as const,
  suggested: ['suggested'] as const,
  followers: (id: string) => ['followers', id] as const,
  following: (id: string) => ['following', id] as const,
};

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ---------- Feed & workouts ----------

export function useFeed() {
  return useInfiniteQuery({
    queryKey: keys.feed,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const res = await supabase.rpc('get_feed', { p_limit: PAGE, ...(pageParam ? { p_before: pageParam } : {}) });
      return unwrap(res) as WorkoutCard[];
    },
    getNextPageParam: (last) => (last.length < PAGE ? undefined : (last[last.length - 1]?.started_at ?? undefined)),
  });
}

export function useUserWorkouts(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: keys.userWorkouts(userId ?? ''),
    enabled: !!userId,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from('workout_cards')
        .select('*')
        .eq('user_id', userId!)
        .not('finished_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(PAGE);
      if (pageParam) q = q.lt('started_at', pageParam);
      return unwrap(await q) as WorkoutCard[];
    },
    getNextPageParam: (last) => (last.length < PAGE ? undefined : (last[last.length - 1]?.started_at ?? undefined)),
  });
}

const WORKOUT_DETAIL_SELECT =
  '*, profile:profiles(id, username, display_name, avatar_url), workout_exercises(*, exercise:exercises(id, name), sets(*))';

export function useWorkout(id: string | undefined) {
  return useQuery({
    queryKey: keys.workout(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const data = unwrap(await supabase.from('workouts').select(WORKOUT_DETAIL_SELECT).eq('id', id!).single()) as unknown as WorkoutDetail;
      data.workout_exercises.sort((a, b) => a.position - b.position);
      data.workout_exercises.forEach((we) => we.sets.sort((a, b) => a.position - b.position));
      return data;
    },
  });
}

export function useFinishWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Json) => unwrap(await supabase.rpc('finish_workout', { payload })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.feed });
      void qc.invalidateQueries({ queryKey: ['userWorkouts'] });
      void qc.invalidateQueries({ queryKey: ['profile'] });
      void qc.invalidateQueries({ queryKey: keys.exercises });
    },
  });
}

export function useDeleteWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('workouts').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.feed });
      void qc.invalidateQueries({ queryKey: ['userWorkouts'] });
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// ---------- Routines ----------

const ROUTINE_SELECT = '*, routine_exercises(*, exercise:exercises(id, name), routine_sets(*))';

function sortRoutine(r: RoutineDetail): RoutineDetail {
  r.routine_exercises.sort((a, b) => a.position - b.position);
  r.routine_exercises.forEach((re) => re.routine_sets.sort((a, b) => a.position - b.position));
  return r;
}

export function useRoutines() {
  return useQuery({
    queryKey: keys.routines,
    queryFn: async () => {
      const rows = unwrap(await supabase.from('routines').select(ROUTINE_SELECT).order('updated_at', { ascending: false })) as unknown as RoutineDetail[];
      return rows.map(sortRoutine);
    },
  });
}

export function useRoutine(id: string | undefined) {
  return useQuery({
    queryKey: keys.routine(id ?? ''),
    enabled: !!id && id !== 'new',
    queryFn: async () =>
      sortRoutine(unwrap(await supabase.from('routines').select(ROUTINE_SELECT).eq('id', id!).single()) as unknown as RoutineDetail),
  });
}

export function useSaveRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Json) => unwrap(await supabase.rpc('save_routine', { payload })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.routines });
      void qc.invalidateQueries({ queryKey: ['routine'] });
      void qc.invalidateQueries({ queryKey: keys.exercises });
    },
  });
}

export function useCopyWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (workoutId: string) => unwrap(await supabase.rpc('copy_workout_to_routine', { p_workout_id: workoutId })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.routines });
      void qc.invalidateQueries({ queryKey: keys.exercises });
    },
  });
}

export function useDeleteRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('routines').delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.routines }),
  });
}

// ---------- Exercises ----------

export function useExercises() {
  return useQuery({
    queryKey: keys.exercises,
    queryFn: async () => unwrap(await supabase.from('exercises').select('*').order('name')) as Tables<'exercises'>[],
  });
}

// ---------- Profiles & social ----------

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: keys.profile(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const rows = unwrap(await supabase.rpc('get_profile', { p_user_id: userId! })) as ProfileStats[];
      if (!rows[0]) throw new Error('Profile not found');
      return rows[0];
    },
  });
}

export function useSearchProfiles(q: string) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: keys.search(trimmed),
    enabled: trimmed.length > 0,
    queryFn: async () => unwrap(await supabase.rpc('search_profiles', { q: trimmed, p_limit: 30 })) as ProfileSummaryRow[],
  });
}

export function useSuggestedProfiles() {
  return useQuery({
    queryKey: keys.suggested,
    queryFn: async () => unwrap(await supabase.rpc('suggested_profiles', { p_limit: 15 })) as ProfileSummaryRow[],
  });
}

export function useFollowers(userId: string | undefined) {
  return useQuery({
    queryKey: keys.followers(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => unwrap(await supabase.rpc('get_followers', { p_user_id: userId! })) as ProfileSummaryRow[],
  });
}

export function useFollowing(userId: string | undefined) {
  return useQuery({
    queryKey: keys.following(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => unwrap(await supabase.rpc('get_following', { p_user_id: userId! })) as ProfileSummaryRow[],
  });
}

export function useFollowMutation(myId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, follow }: { userId: string; follow: boolean }) => {
      if (!myId) throw new Error('Not signed in');
      if (follow) {
        const { error } = await supabase.from('follows').insert({ follower_id: myId, followee_id: userId });
        if (error && error.code !== '23505') throw new Error(error.message);
      } else {
        const { error } = await supabase.from('follows').delete().eq('follower_id', myId).eq('followee_id', userId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: (_d, { userId }) => {
      void qc.invalidateQueries({ queryKey: keys.profile(userId) });
      if (myId) void qc.invalidateQueries({ queryKey: keys.profile(myId) });
      void qc.invalidateQueries({ queryKey: ['followers'] });
      void qc.invalidateQueries({ queryKey: ['following'] });
      void qc.invalidateQueries({ queryKey: ['search'] });
      void qc.invalidateQueries({ queryKey: keys.suggested });
      void qc.invalidateQueries({ queryKey: keys.feed });
    },
  });
}

export function useUpdateProfile(myId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Tables<'profiles'>, 'display_name' | 'bio' | 'weight_unit' | 'username'>>) => {
      if (!myId) throw new Error('Not signed in');
      const { error } = await supabase.from('profiles').update(patch).eq('id', myId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      if (myId) void qc.invalidateQueries({ queryKey: keys.profile(myId) });
      void qc.invalidateQueries({ queryKey: keys.feed });
    },
  });
}
