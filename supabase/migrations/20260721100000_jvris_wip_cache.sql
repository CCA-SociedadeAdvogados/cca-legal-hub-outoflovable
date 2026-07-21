-- ============================================================
-- Conector JVRIS — cache de WIP/timesheets (I1 do blueprint, decisão Q1)
--
-- A base CCA_WIP (SQL Server, PT-LX-SQL01) só é acessível na rede interna,
-- pelo que segue o padrão do Business Central: um agente de sync corre
-- dentro da rede (scripts/jvris-wip-agent) e faz upsert nestas tabelas de
-- cache via service role; o cockpit lê daqui.
--
-- Grão de jvris_wip_registos = fact_wip: colaborador × dossier × dia.
-- Datas "vazias" do JVRIS (< 1901-01-01) são normalizadas para NULL pelo
-- agente. Segurança: dados internos (valores/horas por colaborador) —
-- leitura APENAS para utilizadores CCA; nenhuma exposição ao portal.
-- ============================================================

create table public.jvris_wip_registos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cli_code text not null,            -- fact_wip.Cli
  cliente_nome text,                 -- fact_wip.ClienteNome
  dossier_code text not null,        -- fact_wip.Dos
  dossier_des text,                  -- fact_wip.DossierDes
  dossier_dep text,                  -- fact_wip.DossierDep (COM, TRI, FIS, …)
  dossier_res text,                  -- fact_wip.DossierRes
  colab_code text not null default '', -- fact_wip.Clb
  colab_nome text,                   -- fact_wip.ColabNome
  valor_reg numeric(14, 2),          -- fact_wip.ValReg (EUR)
  horas_reg numeric(8, 2),           -- fact_wip.HorasReg
  dia date not null,                 -- fact_wip.Dia
  dia_fac date,                      -- fact_wip.DiaFac (null = não faturado)
  is_wip boolean not null default true, -- fact_wip.IsWIP
  dossier_fec date,                  -- fact_wip.DossierFec (null = aberto)
  dossier_sus date,                  -- fact_wip.DossierSus (null = não suspenso)
  synced_at timestamptz not null default now(),
  unique (organization_id, dossier_code, colab_code, dia)
);

create index idx_jvris_wip_org_dia on public.jvris_wip_registos (organization_id, dia desc);
create index idx_jvris_wip_org_dossier on public.jvris_wip_registos (organization_id, dossier_code);

create table public.jvris_wip_sync_logs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'warning', 'error')),
  rows_read int,
  rows_upserted int,
  rows_skipped_no_org int,
  orgs_matched int,
  wip_total_eur numeric(14, 2),      -- sanity-check: normal ≈ 2,0–2,2 M€
  wip_dossiers int,                  -- sanity-check: normal ≈ 3 100–3 250
  error text,
  details jsonb
);

create index idx_jvris_wip_sync_logs_started on public.jvris_wip_sync_logs (started_at desc);

-- ── RLS: leitura só CCA; escrita só service role (sem políticas de escrita) ──
alter table public.jvris_wip_registos enable row level security;
alter table public.jvris_wip_sync_logs enable row level security;

create policy jvris_wip_cca_read on public.jvris_wip_registos
  for select using (public.is_cca_user(auth.uid()) or public.is_platform_admin(auth.uid()));
create policy jvris_wip_logs_cca_read on public.jvris_wip_sync_logs
  for select using (public.is_cca_user(auth.uid()) or public.is_platform_admin(auth.uid()));

notify pgrst, 'reload schema';
