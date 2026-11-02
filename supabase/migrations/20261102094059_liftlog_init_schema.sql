-- LiftLog core schema
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (length(username) between 3 and 30 and username ~ '^[A-Za-z0-9_.]+$'),
  display_name text,
  bio text,
  avatar_url text,
  weight_unit text not null default 'kg' check (weight_unit in ('kg','lb')),
  created_at timestamptz not null default now()
);
create unique index profiles_username_lower_idx on public.profiles (lower(username));

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);
create unique index exercises_owner_name_idx on public.exercises (owner_id, lower(name));

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Workout',
  notes text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_seconds int,
  created_at timestamptz not null default now()
);
create index workouts_user_started_idx on public.workouts (user_id, started_at desc);
create index workouts_started_idx on public.workouts (started_at desc) where finished_at is not null;

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position int not null default 0,
  notes text,
  rest_seconds int not null default 90
);
create index workout_exercises_workout_idx on public.workout_exercises (workout_id);
create index workout_exercises_exercise_idx on public.workout_exercises (exercise_id);

create table public.sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises(id) on delete cascade,
  position int not null default 0,
  weight_kg numeric(7,2),
  reps int,
  completed boolean not null default true
);
create index sets_workout_exercise_idx on public.sets (workout_exercise_id);

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Routine',
  notes text,
  source_workout_id uuid references public.workouts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index routines_user_idx on public.routines (user_id, updated_at desc);
create index routines_source_workout_idx on public.routines (source_workout_id);

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,
  position int not null default 0,
  notes text,
  rest_seconds int not null default 90
);
create index routine_exercises_routine_idx on public.routine_exercises (routine_id);
create index routine_exercises_exercise_idx on public.routine_exercises (exercise_id);

create table public.routine_sets (
  id uuid primary key default gen_random_uuid(),
  routine_exercise_id uuid not null references public.routine_exercises(id) on delete cascade,
  position int not null default 0,
  weight_kg numeric(7,2),
  reps int
);
create index routine_sets_routine_exercise_idx on public.routine_sets (routine_exercise_id);

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index follows_followee_idx on public.follows (followee_id);

-- Create a profile row for every new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text;
  v_suffix text := left(replace(new.id::text, '-', ''), 6);
begin
  v_username := nullif(trim(new.raw_user_meta_data->>'username'), '');
  if v_username is null or v_username !~ '^[A-Za-z0-9_.]{3,30}$' then
    v_username := 'user_' || v_suffix;
  end if;
  if exists (select 1 from public.profiles p where lower(p.username) = lower(v_username)) then
    v_username := left(v_username, 23) || '_' || v_suffix;
  end if;
  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, nullif(trim(new.raw_user_meta_data->>'display_name'), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep routines.updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger routines_set_updated_at before update on public.routines
  for each row execute function public.set_updated_at();
