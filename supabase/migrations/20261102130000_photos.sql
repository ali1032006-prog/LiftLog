-- Public-read buckets; files live under "<user id>/..." and only the owner can write them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('workout-photos', 'workout-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "photos: owner can read own files" on storage.objects
  for select to authenticated
  using (bucket_id in ('avatars', 'workout-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos: owner can upload" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('avatars', 'workout-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos: owner can replace" on storage.objects
  for update to authenticated
  using (bucket_id in ('avatars', 'workout-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos: owner can delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('avatars', 'workout-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Photos attached to a workout (path inside the workout-photos bucket)
create table public.workout_photos (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  path text not null unique check (path like user_id::text || '/%'),
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index workout_photos_workout_idx on public.workout_photos (workout_id, position);
create index workout_photos_user_idx on public.workout_photos (user_id);
alter table public.workout_photos enable row level security;

create policy "workout_photos: read with the workout" on public.workout_photos
  for select to authenticated
  using (exists (select 1 from public.workouts w
                 where w.id = workout_id and (w.user_id = (select auth.uid()) or w.finished_at is not null)));
create policy "workout_photos: owner can add" on public.workout_photos
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = (select auth.uid())));
create policy "workout_photos: owner can delete" on public.workout_photos
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Feed cards gain the photo paths (appended column keeps the view compatible)
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
             order by count(*) desc, we.weight_unit limit 1), 'kg') as volume_unit,
  (select coalesce(jsonb_agg(ph.path order by ph.position, ph.created_at), '[]'::jsonb)
     from public.workout_photos ph where ph.workout_id = w.id) as photos
from public.workouts w
join public.profiles p on p.id = w.user_id;

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

-- finish_workout also attaches photos uploaded during the workout (payload.photos = [path, ...])
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
  v_path text;
  i int := 0;
  j int;
  k int := 0;
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

  for v_path in select jsonb_array_elements_text(coalesce(payload->'photos', '[]'::jsonb)) loop
    k := k + 1;
    insert into public.workout_photos (workout_id, user_id, path, position)
    values (v_workout_id, v_uid, v_path, k);
  end loop;
  return v_workout_id;
end;
$$;
revoke execute on function public.finish_workout(jsonb) from anon;
