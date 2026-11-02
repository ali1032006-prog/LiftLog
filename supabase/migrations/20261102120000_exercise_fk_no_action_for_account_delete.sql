-- RESTRICT is checked immediately, which breaks the cascade when a whole account is deleted
-- (exercises can be removed before the workout rows that reference them). NO ACTION checks at
-- the end of the statement, so the cascade completes while stray deletes are still blocked.
alter table public.workout_exercises drop constraint workout_exercises_exercise_id_fkey,
  add constraint workout_exercises_exercise_id_fkey foreign key (exercise_id) references public.exercises(id);
alter table public.routine_exercises drop constraint routine_exercises_exercise_id_fkey,
  add constraint routine_exercises_exercise_id_fkey foreign key (exercise_id) references public.exercises(id);
