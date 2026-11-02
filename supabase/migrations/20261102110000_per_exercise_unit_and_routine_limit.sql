-- Weight unit chosen per exercise (weights are still stored in kg)
alter table public.exercises add column weight_unit text not null default 'kg' check (weight_unit in ('kg','lb'));
alter table public.workout_exercises add column weight_unit text not null default 'kg' check (weight_unit in ('kg','lb'));
alter table public.routine_exercises add column weight_unit text not null default 'kg' check (weight_unit in ('kg','lb'));

-- Backfill from the old per-user setting
update public.exercises e set weight_unit = p.weight_unit from public.profiles p where p.id = e.owner_id;
update public.workout_exercises we set weight_unit = p.weight_unit
  from public.workouts w join public.profiles p on p.id = w.user_id where w.id = we.workout_id;
update public.routine_exercises re set weight_unit = p.weight_unit
  from public.routines r join public.profiles p on p.id = r.user_id where r.id = re.routine_id;

-- At most 4 saved routines per user
create or replace function public.enforce_routine_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('routines:' || new.user_id::text));
  if (select count(*) from public.routines where user_id = new.user_id) >= 4 then
    raise exception 'You can save up to 4 routines. Delete one to add another.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger routines_limit before insert on public.routines
  for each row execute function public.enforce_routine_limit();
revoke execute on function public.enforce_routine_limit() from public, anon, authenticated;

-- Workout cards: include each exercise's unit and the workout's most-used unit for the volume total
create or replace view public.workout_cards
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
      'best_reps', x.reps_at_max,
      'weight_unit', we.weight_unit
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
   where we.workout_id = w.id) as exercises,
  coalesce((select we.weight_unit from public.workout_exercises we
             where we.workout_id = w.id group by we.weight_unit
             order by count(*) desc, we.weight_unit limit 1), 'kg') as volume_unit
from public.workouts w
join public.profiles p on p.id = w.user_id;

-- Recreate the feed so it picks up the new view shape
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

create or replace function public.clean_unit(p text)
returns text language sql immutable set search_path = ''
as $$ select case when p in ('kg','lb') then p else 'kg' end $$;

-- finish_workout: store each exercise's unit and remember it as the user's preference for that exercise
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
  v_ex_id uuid;
  v_unit text;
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
    v_ex_id := public.find_or_create_exercise(v_ex->>'name');
    v_unit := public.clean_unit(v_ex->>'weight_unit');
    update public.exercises set weight_unit = v_unit where id = v_ex_id and owner_id = v_uid;
    insert into public.workout_exercises (workout_id, exercise_id, position, notes, rest_seconds, weight_unit)
    values (v_workout_id, v_ex_id, i,
            nullif(trim(coalesce(v_ex->>'notes', '')), ''),
            coalesce((v_ex->>'rest_seconds')::int, 90), v_unit)
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
  v_ex_id uuid;
  v_unit text;
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
    v_ex_id := public.find_or_create_exercise(v_ex->>'name');
    v_unit := public.clean_unit(v_ex->>'weight_unit');
    update public.exercises set weight_unit = v_unit where id = v_ex_id and owner_id = v_uid;
    insert into public.routine_exercises (routine_id, exercise_id, position, notes, rest_seconds, weight_unit)
    values (v_routine_id, v_ex_id, i,
            nullif(trim(coalesce(v_ex->>'notes', '')), ''),
            coalesce((v_ex->>'rest_seconds')::int, 90), v_unit)
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
    select we.id, we.position, we.notes, we.rest_seconds, we.weight_unit, e.name
    from public.workout_exercises we join public.exercises e on e.id = we.exercise_id
    where we.workout_id = p_workout_id order by we.position
  loop
    insert into public.routine_exercises (routine_id, exercise_id, position, notes, rest_seconds, weight_unit)
    values (v_routine_id, public.find_or_create_exercise(r.name), r.position, r.notes, r.rest_seconds, r.weight_unit)
    returning id into v_re_id;
    for s in select position, weight_kg, reps from public.sets where workout_exercise_id = r.id order by position loop
      insert into public.routine_sets (routine_exercise_id, position, weight_kg, reps)
      values (v_re_id, s.position, s.weight_kg, s.reps);
    end loop;
  end loop;
  return v_routine_id;
end;
$$;

revoke execute on function public.finish_workout(jsonb) from anon;
revoke execute on function public.save_routine(jsonb) from anon;
revoke execute on function public.copy_workout_to_routine(uuid) from anon;
