-- One row per Premium checkout, tracking where the payment is: pending, accepted, declined or
-- cancelled. People can read their own orders; only the premium function (service role)
-- creates and updates them, after checking the real status with MyFatoorah.
create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('monthly', 'yearly')),
  amount numeric(10, 2) not null,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  provider text not null default 'myfatoorah',
  invoice_id text unique,
  payment_id text,
  -- Provider's reason when a payment fails, e.g. the bank's decline message.
  status_detail text,
  -- Premium end date after this order was accepted.
  premium_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payment_orders_user_idx on public.payment_orders (user_id, created_at desc);
alter table public.payment_orders enable row level security;

create policy "payment_orders: owner can read" on public.payment_orders
  for select to authenticated
  using (user_id = (select auth.uid()));
