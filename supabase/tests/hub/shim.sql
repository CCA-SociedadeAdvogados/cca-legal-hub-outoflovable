-- Shim alargado do ambiente Supabase para testar a migração hub_fase1 (PG16).
-- Inclui as dependências reais: identidade, assuntos, contratos, notifications,
-- audit_logs e um stub de cron (pg_cron não existe localmente).

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

create schema if not exists auth;
-- Igual ao real do Supabase: nullif ANTES do cast (claims vazias → null)
create or replace function auth.uid() returns uuid
language sql stable as
$$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;

-- stub pg_cron (a migração local salta o create extension via sed)
create schema if not exists cron;
create or replace function cron.schedule(text, text, text) returns bigint
language sql as $$ select 1::bigint $$;

do $$ begin create type public.app_role as enum ('owner','admin','editor','viewer'); exception when duplicate_object then null; end $$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text,
  org_type text default 'client',
  client_code text,
  "group" text,
  is_active boolean not null default true
);
create table public.profiles (
  id uuid primary key,
  email text,
  auth_method text default 'local',
  current_organization_id uuid references public.organizations(id)
);
create table public.organization_members (
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null,
  role public.app_role not null default 'viewer',
  primary key (organization_id, user_id)
);
create table public.platform_admins (user_id uuid primary key);

-- Helpers reais (copiados das migrações do repo)
CREATE OR REPLACE FUNCTION public.is_cca_user(_uid uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    JOIN public.organizations o ON o.id = om.organization_id
    WHERE om.user_id = _uid AND o.org_type = 'cca_owner'
  )
$$;
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id)
$$;
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT current_organization_id FROM public.profiles WHERE id = _user_id
$$;
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- assuntos + assunto_eventos (esquema e RLS reais de 20260619000016)
create table public.assuntos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  titulo text not null,
  descricao text,
  tipo text not null default 'outro',
  estado text not null default 'aberto',
  referencia text,
  responsavel_id uuid,
  data_abertura date not null default current_date,
  data_prevista_conclusao date,
  data_conclusao date,
  created_by_id uuid,
  updated_by_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.assunto_eventos (
  id uuid primary key default gen_random_uuid(),
  assunto_id uuid not null references public.assuntos(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  titulo text not null,
  descricao text,
  tipo text not null default 'atualizacao',
  data date not null default current_date,
  visivel_cliente boolean not null default true,
  created_by_id uuid,
  created_at timestamptz not null default now()
);
alter table public.assuntos enable row level security;
alter table public.assunto_eventos enable row level security;
CREATE POLICY assuntos_select ON public.assuntos FOR SELECT TO authenticated
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR is_cca_user(auth.uid())
  OR is_platform_admin(auth.uid())
);
CREATE POLICY assuntos_cca_write ON public.assuntos FOR ALL TO authenticated
USING (is_cca_user(auth.uid()) OR is_platform_admin(auth.uid()))
WITH CHECK (is_cca_user(auth.uid()) OR is_platform_admin(auth.uid()));
CREATE POLICY ae_select ON public.assunto_eventos FOR SELECT TO authenticated
USING (
  (visivel_cliente AND organization_id = get_user_organization_id(auth.uid()))
  OR is_cca_user(auth.uid())
  OR is_platform_admin(auth.uid())
);

-- contratos (subconjunto usado por fn_sync_contratos_hub_eventos)
create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  titulo_contrato text not null,
  estado_contrato text not null default 'activo',
  arquivado boolean default false,
  data_termo date,
  data_limite_decisao_renovacao date
);

-- notifications + audit_logs (esquemas reais)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  reference_type text,
  reference_id uuid,
  read boolean default false,
  read_at timestamptz,
  created_at timestamptz default now(),
  metadata jsonb default '{}'
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid,
  user_id uuid not null,
  user_email text,
  action text not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

-- Grants tal como o Supabase
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
