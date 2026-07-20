-- Shim do ambiente Supabase para testar a migração localmente (PG16).
-- Replica: roles, auth.uid(), tabelas de identidade e helpers reais do repo.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create or replace function auth.uid() returns uuid
language sql stable as
$$ select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;

-- Esquema mínimo de identidade do repo (nomes/colunas reais)
create type public.app_role as enum ('owner','admin','editor','viewer');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text,
  org_type text,
  client_code text
);
create table public.profiles (
  id uuid primary key,
  email text,
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

-- Grants tal como o Supabase os cria por omissão (RLS é que restringe linhas)
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
