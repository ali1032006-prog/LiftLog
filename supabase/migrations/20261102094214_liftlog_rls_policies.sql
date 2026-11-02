alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.sets enable row level security;
alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.routine_sets enable row level security;
alter table public.follows enable row level security;

-- profiles
create policy "profiles: authenticated can read" on public.profiles
  for select to authenticated using (true);
create policy "profiles: owner can update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- exercises
create policy "exercises: authenticated can read" on public.exercises
  for select to authenticated using (true);
create policy "exercises: owner can insert" on public.exercises
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "exercises: owner can update" on public.exercises
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "exercises: owner can delete" on public.exercises
  for delete to authenticated using (owner_id = (select auth.uid()));

-- workouts: finished workouts are public to signed-in users, drafts are private
create policy "workouts: read finished or own" on public.workouts
  for select to authenticated
  using (user_id = (select auth.uid()) or finished_at is not null);
create policy "workouts: owner can insert" on public.workouts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "workouts: owner can update" on public.workouts
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "workouts: owner can delete" on public.workouts
  for delete to authenticated using (user_id = (select auth.uid()));

-- workout_exercises
create policy "workout_exercises: read via workout" on public.workout_exercises
  for select to authenticated
  using (exists (select 1 from public.workouts w
                 where w.id = workout_id
                   and (w.user_id = (select auth.uid()) or w.finished_at is not null)));
create policy "workout_exercises: owner can insert" on public.workout_exercises
  for insert to authenticated
  with check (exists (select 1 from public.workouts w
                      where w.id = workout_id and w.user_id = (select auth.uid())));
create policy "workout_exercises: owner can update" on public.workout_exercises
  for update to authenticated
  using (exists (select 1 from public.workouts w
                 where w.id = workout_id and w.user_id = (select auth.uid())));
create policy "workout_exercises: owner can delete" on public.workout_exercises
  for delete to authenticated
  using (exists (select 1 from public.workouts w
                 where w.id = workout_id and w.user_id = (select auth.uid())));

-- sets
create policy "sets: read via workout" on public.sets
  for select to authenticated
  using (exists (select 1 from public.workout_exercises we
                 join public.workouts w on w.id = we.workout_id
                 where we.id = workout_exercise_id
                   and (w.user_id = (select auth.uid()) or w.finished_at is not null)));
create policy "sets: owner can insert" on public.sets
  for insert to authenticated
  with check (exists (select 1 from public.workout_exercises we
                      join public.workouts w on w.id = we.workout_id
                      where we.id = workout_exercise_id and w.user_id = (select auth.uid())));
create policy "sets: owner can update" on public.sets
  for update to authenticated
  using (exists (select 1 from public.workout_exercises we
                 join public.workouts w on w.id = we.workout_id
                 where we.id = workout_exercise_id and w.user_id = (select auth.uid())));
create policy "sets: owner can delete" on public.sets
  for delete to authenticated
  using (exists (select 1 from public.workout_exercises we
                 join public.workouts w on w.id = we.workout_id
                 where we.id = workout_exercise_id and w.user_id = (select auth.uid())));

-- routines (private)
create policy "routines: owner all" on public.routines
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "routine_exercises: owner all" on public.routine_exercises
  for all to authenticated
  using (exists (select 1 from public.routines r
                 where r.id = routine_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.routines r
                      where r.id = routine_id and r.user_id = (select auth.uid())));
create policy "routine_sets: owner all" on public.routine_sets
  for all to authenticated
  using (exists (select 1 from public.routine_exercises re
                 join public.routines r on r.id = re.routine_id
                 where re.id = routine_exercise_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.routine_exercises re
                      join public.routines r on r.id = re.routine_id
                      where re.id = routine_exercise_id and r.user_id = (select auth.uid())));

-- follows
create policy "follows: authenticated can read" on public.follows
  for select to authenticated using (true);
create policy "follows: follower can insert" on public.follows
  for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "follows: follower can delete" on public.follows
  for delete to authenticated using (follower_id = (select auth.uid()));
