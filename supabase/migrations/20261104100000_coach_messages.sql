-- Chat history with the AI coach. People can read and clear their own messages; only the
-- coach-chat server function (service role) writes them, so the daily limit can't be bypassed.
create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (length(content) between 1 and 8000),
  created_at timestamptz not null default now()
);
create index coach_messages_user_idx on public.coach_messages (user_id, created_at desc);
alter table public.coach_messages enable row level security;

create policy "coach_messages: owner can read" on public.coach_messages
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "coach_messages: owner can clear" on public.coach_messages
  for delete to authenticated
  using (user_id = (select auth.uid()));
