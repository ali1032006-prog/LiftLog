-- Summary card per workout (RLS of underlying tables applies)
create view public.workout_cards
with (security_invoker = true) as
select
  w.id as workout_id,
  w.user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  w.title,
  w.notes,
  w.started_at,
  w.finished_at,
  w.duration_seconds,
  (select count(*)::int from public.workout_exercises we where we.workout_id = w.id) as exercise_count,
  (select count(*)::int from public.sets s
     join public.workout_exercises we on we.id = s.workout_exercise_id
    where we.workout_id = w.id and s.completed) as set_count,
  (select coalesce(sum(s.weight_kg * s.reps), 0)::numeric from public.sets s
     join public.workout_exercises we on we.id = s.workout_exercise_id
    where we.workout_id = w.id and s.completed) as total_volume_kg,
  (select coalesce(jsonb_agg(jsonb_build_object(
      'name', e.name,
      'set_count', x.cnt,
      'best_weight_kg', x.max_weight,
      'best_reps', x.reps_at_max
    ) order by we.position), '[]'::jsonb)
   from public.workout_exercises we
   join public.exercises e on e.id = we.exercise_id
   left join lateral (
     select count(*)::int as cnt,
            max(s.weight_kg) as max_weight,
            (select s2.reps from public.sets s2
              where s2.workout_exercise_id = we.id and s2.completed
              order by s2.weight_kg desc nulls last, s2.reps desc nulls last limit 1) as reps_at_max
       from public.sets s where s.workout_exercise_id = we.id and s.completed
   ) x on true
   where we.workout_id = w.id) as exercises
from public.workouts w
join public.profiles p on p.id = w.user_id;

-- Username availability (callable before signup)
create or replace function public.username_available(p_username text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select p_username ~ '^[A-Za-z0-9_.]{3,30}$'
     and not exists (select 1 from public.profiles where lower(username) = lower(p_username));
$$;

-- Find or create one of the caller's exercises by name
create or replace function public.find_or_create_exercise(p_name text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := trim(p_name);
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_name is null or length(v_name) = 0 then raise exception 'exercise name required'; end if;
  select id into v_id from public.exercises where owner_id = v_uid and lower(name) = lower(v_name);
  if v_id is null then
    insert into public.exercises (owner_id, name) values (v_uid, v_name) returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- Save a finished workout in one transaction
-- payload: {title, notes, started_at, finished_at, duration_seconds,
--           exercises:[{name, notes, rest_seconds, sets:[{weight_kg, reps, completed}]}]}
create or replace function public.finish_workout(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_workout_id uuid;
  v_we_id uuid;
  v_ex jsonb;
  v_set jsonb;
  i int := 0;
  j int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  insert into public.workouts (user_id, title, notes, started_at, finished_at, duration_seconds)
  values (
    v_uid,
    coalesce(nullif(trim(payload->>'title'), ''), 'Workout'),
    nullif(trim(coalesce(payload->>'notes', '')), ''),
    coalesce((payload->>'started_at')::timestamptz, now()),
    coalesce((payload->>'finished_at')::timestamptz, now()),
    coalesce((payload->>'duration_seconds')::int, 0)
  ) returning id into v_workout_id;

  for v_ex in select * from jsonb_array_elements(coalesce(payload->'exercises', '[]'::jsonb)) loop
    i := i + 1;
    insert into public.workout_exercises (workout_id, exercise_id, position, notes, rest_seconds)
    values (v_workout_id, public.find_or_create_exercise(v_ex->>'name'), i,
            nullif(trim(coalesce(v_ex->>'notes', '')), ''),
            coalesce((v_ex->>'rest_seconds')::int, 90))
    returning id into v_we_id;
    j := 0;
    for v_set in select * from jsonb_array_elements(coalesce(v_ex->'sets', '[]'::jsonb)) loop
      j := j + 1;
      insert into public.sets (workout_exercise_id, position, weight_kg, reps, completed)
      values (v_we_id, j, (v_set->>'weight_kg')::numeric, (v_set->>'reps')::int,
              coalesce((v_set->>'completed')::boolean, true));
    end loop;
  end loop;
  return v_workout_id;
end;
$$;

-- Home feed: my workouts + workouts of people I follow
create or replace function public.get_feed(p_limit int default 20, p_before timestamptz default null)
returns setof public.workout_cards
language sql
security invoker
stable
set search_path = ''
as $$
  select c.*
  from public.workout_cards c
  where c.finished_at is not null
    and (c.user_id = (select auth.uid())
         or c.user_id in (select f.followee_id from public.follows f where f.follower_id = (select auth.uid())))
    and (p_before is null or c.started_at < p_before)
  order by c.started_at desc
  limit p_limit;
$$;

-- Profile with counts
create or replace function public.get_profile(p_user_id uuid)
returns table (
  id uuid, username text, display_name text, bio text, avatar_url text, weight_unit text,
  created_at timestamptz, workout_count int, follower_count int, following_count int, is_following boolean
)
language sql
security invoker
stable
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.bio, p.avatar_url, p.weight_unit, p.created_at,
    (select count(*)::int from public.workouts w where w.user_id = p.id and w.finished_at is not null),
    (select count(*)::int from public.follows f where f.followee_id = p.id),
    (select count(*)::int from public.follows f where f.follower_id = p.id),
    exists (select 1 from public.follows f where f.followee_id = p.id and f.follower_id = (select auth.uid()))
  from public.profiles p
  where p.id = p_user_id;
$$;

-- User search
create or replace function public.search_profiles(q text, p_limit int default 20)
returns table (id uuid, username text, display_name text, avatar_url text, follower_count int, is_following boolean)
language sql
security invoker
stable
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url,
    (select count(*)::int from public.follows f where f.followee_id = p.id),
    exists (select 1 from public.follows f where f.followee_id = p.id and f.follower_id = (select auth.uid()))
  from public.profiles p
  where p.id <> (select auth.uid())
    and length(trim(q)) > 0
    and (p.username ilike '%' || trim(q) || '%' or p.display_name ilike '%' || trim(q) || '%')
  order by (lower(p.username) = lower(trim(q))) desc, p.username
  limit p_limit;
$$;

-- Suggested people: newest users I don't follow yet
create or replace function public.suggested_profiles(p_limit int default 10)
returns table (id uuid, username text, display_name text, avatar_url text, follower_count int, is_following boolean)
language sql
security invoker
stable
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url,
    (select count(*)::int from public.follows f where f.followee_id = p.id),
    false
  from public.profiles p
  where p.id <> (select auth.uid())
    and not exists (select 1 from public.follows f where f.followee_id = p.id and f.follower_id = (select auth.uid()))
  order by p.created_at desc
  limit p_limit;
$$;

-- Follower / following lists
create or replace function public.get_followers(p_user_id uuid)
returns table (id uuid, username text, display_name text, avatar_url text, follower_count int, is_following boolean)
language sql security invoker stable set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url,
    (select count(*)::int from public.follows f2 where f2.followee_id = p.id),
    exists (select 1 from public.follows f3 where f3.followee_id = p.id and f3.follower_id = (select auth.uid()))
  from public.follows f join public.profiles p on p.id = f.follower_id
  where f.followee_id = p_user_id
  order by f.created_at desc;
$$;

create or replace function public.get_following(p_user_id uuid)
returns table (id uuid, username text, display_name text, avatar_url text, follower_count int, is_following boolean)
language sql security invoker stable set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url,
    (select count(*)::int from public.follows f2 where f2.followee_id = p.id),
    exists (select 1 from public.follows f3 where f3.followee_id = p.id and f3.follower_id = (select auth.uid()))
  from public.follows f join public.profiles p on p.id = f.followee_id
  where f.follower_id = p_user_id
  order by f.created_at desc;
$$;

-- Copy any visible finished workout into one of my routines
create or replace function public.copy_workout_to_routine(p_workout_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_routine_id uuid;
  v_re_id uuid;
  r record;
  s record;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.workouts w where w.id = p_workout_id and w.finished_at is not null) then
    raise exception 'workout not found';
  end if;
  insert into public.routines (user_id, title, notes, source_workout_id)
  select v_uid, w.title, w.notes, w.id from public.workouts w where w.id = p_workout_id
  returning id into v_routine_id;

  for r in
    select we.id, we.position, we.notes, we.rest_seconds, e.name
    from public.workout_exercises we join public.exercises e on e.id = we.exercise_id
    where we.workout_id = p_workout_id order by we.position
  loop
    insert into public.routine_exercises (routine_id, exercise_id, position, notes, rest_seconds)
    values (v_routine_id, public.find_or_create_exercise(r.name), r.position, r.notes, r.rest_seconds)
    returning id into v_re_id;
    for s in select position, weight_kg, reps from public.sets where workout_exercise_id = r.id order by position loop
      insert into public.routine_sets (routine_exercise_id, position, weight_kg, reps)
      values (v_re_id, s.position, s.weight_kg, s.reps);
    end loop;
  end loop;
  return v_routine_id;
end;
$$;

-- Create or replace a routine from the editor
-- payload: {id?, title, notes, exercises:[{name, notes, rest_seconds, sets:[{weight_kg, reps}]}]}
create or replace function public.save_routine(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_routine_id uuid := nullif(payload->>'id', '')::uuid;
  v_re_id uuid;
  v_ex jsonb;
  v_set jsonb;
  i int := 0;
  j int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if v_routine_id is null then
    insert into public.routines (user_id, title, notes)
    values (v_uid, coalesce(nullif(trim(payload->>'title'), ''), 'Routine'), nullif(trim(coalesce(payload->>'notes', '')), ''))
    returning id into v_routine_id;
  else
    update public.routines
       set title = coalesce(nullif(trim(payload->>'title'), ''), 'Routine'),
           notes = nullif(trim(coalesce(payload->>'notes', '')), '')
     where id = v_routine_id and user_id = v_uid;
    if not found then raise exception 'routine not found'; end if;
    delete from public.routine_exercises where routine_id = v_routine_id;
  end if;

  for v_ex in select * from jsonb_array_elements(coalesce(payload->'exercises', '[]'::jsonb)) loop
    i := i + 1;
    insert into public.routine_exercises (routine_id, exercise_id, position, notes, rest_seconds)
    values (v_routine_id, public.find_or_create_exercise(v_ex->>'name'), i,
            nullif(trim(coalesce(v_ex->>'notes', '')), ''),
            coalesce((v_ex->>'rest_seconds')::int, 90))
    returning id into v_re_id;
    j := 0;
    for v_set in select * from jsonb_array_elements(coalesce(v_ex->'sets', '[]'::jsonb)) loop
      j := j + 1;
      insert into public.routine_sets (routine_exercise_id, position, weight_kg, reps)
      values (v_re_id, j, (v_set->>'weight_kg')::numeric, (v_set->>'reps')::int);
    end loop;
  end loop;
  return v_routine_id;
end;
$$;

-- Lock down write RPCs to signed-in users
revoke execute on function public.finish_workout(jsonb) from anon;
revoke execute on function public.save_routine(jsonb) from anon;
revoke execute on function public.copy_workout_to_routine(uuid) from anon;
revoke execute on function public.find_or_create_exercise(text) from anon;
