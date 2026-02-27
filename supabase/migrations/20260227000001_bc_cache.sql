-- ============================================================
-- Business Central Cache + Audit Log + Stats View
-- Migration: 20260227000001_bc_cache.sql
-- ============================================================

-- 1. Tabela de cache para respostas do Business Central via Power Automate
create table if not exists public.bc_cache (
  id            uuid primary key default gen_random_uuid(),
  cache_key     text not null unique,
  payload       jsonb not null,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.bc_cache is
  'Cache de respostas do Business Central (via Power Automate). Gerido pela Edge Function bc-integration.';

-- Índice para purga e lookup por expiração
create index if not exists bc_cache_expires_at_idx on public.bc_cache (expires_at);

-- Trigger para actualizar updated_at
create or replace function public.bc_cache_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bc_cache_updated_at on public.bc_cache;
create trigger bc_cache_updated_at
  before update on public.bc_cache
  for each row execute function public.bc_cache_set_updated_at();

-- 2. Log de auditoria — regista cada chamada à Edge Function bc-integration
create table if not exists public.bc_audit_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  action        text not null,
  cache_hit     boolean not null default false,
  duration_ms   integer,
  error         text,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);

comment on table public.bc_audit_log is
  'Log de auditoria das chamadas à integração Business Central.';

create index if not exists bc_audit_log_created_at_idx on public.bc_audit_log (created_at desc);
create index if not exists bc_audit_log_user_id_idx    on public.bc_audit_log (user_id);
create index if not exists bc_audit_log_action_idx     on public.bc_audit_log (action);

-- 3. View de estatísticas de cache (últimas 24 h)
create or replace view public.bc_cache_stats as
select
  count(*) filter (where expires_at > now())                        as active_entries,
  count(*) filter (where expires_at <= now())                       as expired_entries,
  count(*)                                                          as total_entries,
  min(created_at)                                                   as oldest_entry,
  max(updated_at)                                                   as newest_update
from public.bc_cache;

comment on view public.bc_cache_stats is
  'Estatísticas do cache Business Central (contagens de entradas activas/expiradas).';

-- 4. View de estatísticas de auditoria (últimas 24 h)
create or replace view public.bc_audit_stats_24h as
select
  action,
  count(*)                                                          as total_calls,
  count(*) filter (where cache_hit)                                 as cache_hits,
  round(
    count(*) filter (where cache_hit) * 100.0 / nullif(count(*), 0), 1
  )                                                                 as cache_hit_pct,
  round(avg(duration_ms))                                           as avg_duration_ms,
  count(*) filter (where error is not null)                         as errors
from public.bc_audit_log
where created_at > now() - interval '24 hours'
group by action
order by total_calls desc;

comment on view public.bc_audit_stats_24h is
  'Resumo de chamadas à integração BC nas últimas 24 horas, agrupadas por acção.';

-- 5. RLS — apenas service_role pode escrever; authenticated pode ler o log do próprio utilizador
alter table public.bc_cache    enable row level security;
alter table public.bc_audit_log enable row level security;

-- Cache: somente a service role pode modificar (Edge Function usa service role key)
create policy "service_role_all_bc_cache"
  on public.bc_cache for all
  to service_role
  using (true)
  with check (true);

-- Audit log: cada utilizador pode ver as suas próprias entradas
create policy "users_select_own_bc_audit"
  on public.bc_audit_log for select
  to authenticated
  using (user_id = auth.uid());

create policy "service_role_all_bc_audit"
  on public.bc_audit_log for all
  to service_role
  using (true)
  with check (true);

-- 6. Função utilitária para limpar cache expirado (pode ser chamada por um cron)
create or replace function public.purge_bc_cache()
returns integer language plpgsql security definer as $$
declare
  deleted_count integer;
begin
  delete from public.bc_cache where expires_at <= now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.purge_bc_cache() is
  'Elimina todas as entradas de cache do Business Central que já expiraram.';
