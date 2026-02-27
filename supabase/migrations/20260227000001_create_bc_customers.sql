-- Business Central customers sync table
create table if not exists public.bc_customers (
  id            uuid primary key default gen_random_uuid(),
  bc_id         text not null unique,          -- BC record GUID (conflict key)
  number        text not null default '',
  display_name  text not null default '',
  email         text not null default '',
  phone_number  text not null default '',
  address       jsonb,
  city          text not null default '',
  country       text not null default '',
  currency_code text not null default '',
  credit_limit  numeric,
  balance       numeric,
  blocked       text not null default '',
  raw           jsonb,                         -- full BC response stored as-is
  synced_at     timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- Index for common lookups
create index if not exists bc_customers_number_idx    on public.bc_customers(number);
create index if not exists bc_customers_synced_at_idx on public.bc_customers(synced_at desc);

-- RLS: enable but keep simple
alter table public.bc_customers enable row level security;

-- Authenticated users in the org can read
create policy "authenticated users can read bc_customers"
  on public.bc_customers for select
  to authenticated
  using (true);

-- Only service_role can insert/update (used by Edge Function)
-- No insert/update policy needed — service_role bypasses RLS by default
