-- Photos for exercises people create themselves (up to 2: start and end of the move).
-- Paths point into the exercise-photos bucket and must sit in the owner's own folder.
alter table public.exercises add column photo_paths text[] not null default '{}';
alter table public.exercises add constraint exercises_photo_paths_limit check (cardinality(photo_paths) <= 2);

create or replace function public.check_exercise_photo_paths()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from unnest(new.photo_paths) as p(path) where p.path not like new.owner_id::text || '/%') then
    raise exception 'Exercise photos must be in your own folder';
  end if;
  return new;
end;
$$;
revoke execute on function public.check_exercise_photo_paths() from public, anon, authenticated;

create trigger exercises_photo_paths_owner
  before insert or update of photo_paths on public.exercises
  for each row execute function public.check_exercise_photo_paths();

-- Public-read bucket; owner-only writes under "<user id>/..." like the other photo buckets.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-photos', 'exercise-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

alter policy "photos: owner can read own files" on storage.objects
  using (bucket_id in ('avatars', 'workout-photos', 'exercise-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
alter policy "photos: owner can upload" on storage.objects
  with check (bucket_id in ('avatars', 'workout-photos', 'exercise-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
alter policy "photos: owner can replace" on storage.objects
  using (bucket_id in ('avatars', 'workout-photos', 'exercise-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
alter policy "photos: owner can delete" on storage.objects
  using (bucket_id in ('avatars', 'workout-photos', 'exercise-photos') and (storage.foldername(name))[1] = (select auth.uid())::text);
