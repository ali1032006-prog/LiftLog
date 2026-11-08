-- Paid MyFatoorah invoices. Each invoice can unlock Premium only once, even if the payment
-- callback is opened again.
create table public.subscription_payments (
  invoice_id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('monthly', 'yearly')),
  amount numeric(10, 3),
  currency text,
  provider text not null default 'myfatoorah',
  paid_at timestamptz not null default now()
);
create index subscription_payments_user_idx on public.subscription_payments (user_id, paid_at desc);
alter table public.subscription_payments enable row level security;

create policy "subscription_payments: owner can read" on public.subscription_payments
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Records a verified payment and adds a month or a year of Premium, starting from the later of
-- now and the current end date. Returns false if this invoice was already applied.
-- Only the payment callback (service role) calls this.
create or replace function public.apply_premium_payment(
  p_invoice_id text,
  p_user_id uuid,
  p_plan text,
  p_amount numeric,
  p_currency text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_length interval := case p_plan when 'yearly' then interval '1 year' when 'monthly' then interval '1 month' end;
begin
  if v_length is null then raise exception 'unknown plan %', p_plan; end if;

  insert into public.subscription_payments (invoice_id, user_id, plan, amount, currency)
  values (p_invoice_id, p_user_id, p_plan, p_amount, p_currency)
  on conflict (invoice_id) do nothing;
  if not found then return false; end if;

  insert into public.subscriptions (user_id, plan, status, current_period_end, provider, provider_ref)
  values (p_user_id, p_plan, 'active', now() + v_length, 'myfatoorah', p_invoice_id)
  on conflict (user_id) do update
    set plan = excluded.plan,
        status = 'active',
        current_period_end = greatest(public.subscriptions.current_period_end, now()) + v_length,
        provider = excluded.provider,
        provider_ref = excluded.provider_ref,
        updated_at = now();
  return true;
end;
$$;
revoke execute on function public.apply_premium_payment(text, uuid, text, numeric, text) from public, anon, authenticated;
