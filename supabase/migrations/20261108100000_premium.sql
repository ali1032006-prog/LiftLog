-- LiftLog Premium: subscriptions, weight tracking, and the premium checks behind the
-- coach, weight logging and unlimited routines.

-- One row per person with a paid plan. Only the server (service role, e.g. a payment
-- webhook) writes here, so nobody can give themselves Premium from the app.
create table public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('monthly', 'yearly')),
  -- 'canceled' keeps Premium until current_period_end, then it lapses.
  status text not null default 'active' check (status in ('active', 'canceled', 'expired')),
  current_period_end timestamptz not null,
  provider text,
  provider_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;

create policy "subscriptions: owner can read" on public.subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

-- True when the given person has a paid plan that hasn't run out.
-- Security definer so triggers and policies can check it; it only reveals a yes/no.
create or replace function public.has_premium(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = p_user_id
      and s.status in ('active', 'canceled')
      and s.current_period_end > now()
  );
$$;
revoke execute on function public.has_premium(uuid) from public, anon, authenticated;

-- The signed-in person's own Premium status (what the app and policies call).
create or replace function public.is_premium()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = (select auth.uid())
      and s.status in ('active', 'canceled')
      and s.current_period_end > now()
  );
$$;
revoke execute on function public.is_premium() from public, anon;
grant execute on function public.is_premium() to authenticated;

-- Free plan: up to 4 saved routines. Premium: unlimited.
create or replace function public.enforce_routine_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.has_premium(new.user_id) then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('routines:' || new.user_id::text));
  if (select count(*) from public.routines where user_id = new.user_id) >= 4 then
    raise exception 'The free plan saves up to 4 routines. Upgrade to LiftLog Premium for unlimited routines.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_routine_limit() from public, anon, authenticated;

-- Remember that the Premium popup was shown, so it appears once per account.
alter table public.profiles add column premium_intro_seen_at timestamptz;

-- Body weight log: one entry per person per day. Private to its owner.
create table public.body_weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  logged_on date not null default current_date,
  weight_kg numeric(5, 2) not null check (weight_kg between 20 and 400),
  created_at timestamptz not null default now(),
  unique (user_id, logged_on)
);
alter table public.body_weights enable row level security;

create policy "body_weights: owner can read" on public.body_weights
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "body_weights: premium owner can insert" on public.body_weights
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_premium()));
create policy "body_weights: premium owner can update" on public.body_weights
  for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_premium()))
  with check (user_id = (select auth.uid()));
create policy "body_weights: owner can delete" on public.body_weights
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Goal weight (kept out of profiles, which everyone can read).
create table public.weight_goals (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  goal_kg numeric(5, 2) not null check (goal_kg between 20 and 400),
  updated_at timestamptz not null default now()
);
alter table public.weight_goals enable row level security;

create policy "weight_goals: owner can read" on public.weight_goals
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "weight_goals: premium owner can insert" on public.weight_goals
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_premium()));
create policy "weight_goals: premium owner can update" on public.weight_goals
  for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_premium()))
  with check (user_id = (select auth.uid()));
create policy "weight_goals: owner can delete" on public.weight_goals
  for delete to authenticated
  using (user_id = (select auth.uid()));
