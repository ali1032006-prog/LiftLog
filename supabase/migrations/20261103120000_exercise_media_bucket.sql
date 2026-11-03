-- Copies of the exercise demo photos (free-exercise-db, public domain; wger.de, CC BY-SA).
-- Public read through public URLs. No upload policies: only the service role can write here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-media', 'exercise-media', true, 2097152, array['image/jpeg', 'image/png', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
