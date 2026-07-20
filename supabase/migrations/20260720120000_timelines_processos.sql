-- ============================================================
-- Timelines de processos (docs/timelines/feature-timelines-brief.md)
--
-- 4 tabelas (tl_templates, tl_phases, tl_instances, tl_instance_phases),
-- RLS e funções tl_*. Princípio de segurança: o "nunca com prazos" do
-- cliente é garantido na camada de dados — o único caminho de leitura do
-- cliente são as funções tl_client_* (SECURITY DEFINER), que por
-- construção não selecionam nenhuma coluna de prazo/data. Não existem
-- políticas de SELECT direto para papéis de cliente.
--
-- Helpers de identidade adaptados ao esquema real do repo (o brief
-- assumia profiles.role/org_id, que não existem):
--   - "advogado" = membro da organização CCA (org_type = 'cca_owner',
--     via is_cca_user) ou platform admin (is_platform_admin) — o mesmo
--     critério das restantes políticas RLS em produção.
--   - org do cliente = profiles.current_organization_id, validada por
--     membership em organization_members.
-- ============================================================

-- ── Helpers de identidade ────────────────────────────────────

-- Papel derivado do utilizador autenticado, alinhado com
-- deriveLegalHubProfile em src/hooks/useLegalHubProfile.ts.
create or replace function public.tl_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_platform_admin(auth.uid()) then 'app_admin'
    when exists (
      select 1
      from public.organization_members om
      join public.organizations o on o.id = om.organization_id
      where om.user_id = auth.uid()
        and o.org_type = 'cca_owner'
        and om.role in ('owner', 'admin')
    ) then 'cca_manager'
    when public.is_cca_user(auth.uid()) then 'cca_user'
    when exists (
      select 1 from public.organization_members
      where user_id = auth.uid() and role in ('owner', 'admin', 'editor')
    ) then 'org_manager'
    when exists (
      select 1 from public.organization_members
      where user_id = auth.uid()
    ) then 'org_user'
  end
$$;

-- Org do cliente autenticado: current_organization_id validado por
-- membership (nunca devolve uma org de que o utilizador não seja membro).
create or replace function public.tl_org()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.current_organization_id
  from public.profiles p
  join public.organization_members om
    on om.organization_id = p.current_organization_id
   and om.user_id = p.id
  where p.id = auth.uid()
$$;

create or replace function public.tl_is_lawyer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_cca_user(auth.uid()) or public.is_platform_admin(auth.uid())
$$;

revoke all on function public.tl_role() from public;
revoke all on function public.tl_org() from public;
revoke all on function public.tl_is_lawyer() from public;
grant execute on function public.tl_role() to authenticated;
grant execute on function public.tl_org() to authenticated;
grant execute on function public.tl_is_lawyer() to authenticated;

-- ── Tabelas ──────────────────────────────────────────────────

-- Templates (conteúdo dos docs/timelines/*.md)
create table public.tl_templates (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,          -- ex.: 'civel-cpc'
  title text not null,
  area text,
  jurisdicao text,
  base_legal text,
  versao text,
  created_at timestamptz default now()
);

-- Fases do template (INTERNO: prazo_dias, contagem, anchor)
create table public.tl_phases (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.tl_templates(id) on delete cascade,
  ordem int not null,
  label text not null,               -- seguro para cliente
  tipo text not null check (tipo in ('gatilho', 'prazo_parte', 'prazo_tribunal', 'marco')),
  base_legal text,                   -- interno
  prazo_dias int,                    -- interno
  contagem text,                     -- interno: 'cpc_suspende' | 'cpc_urgente' | 'sem_dilacao' | 'civil'
  anchor text,                       -- interno: id/ordem da fase âncora
  is_optional boolean default false,
  confirmar boolean default false,   -- flag ⚠️ de validação
  notas text,                        -- interno
  unique (template_id, ordem)
);

-- Instância = um caso concreto (INTERNO: gatilho_data, dilacao, urgente)
create table public.tl_instances (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.tl_templates(id),
  matter_ref text,
  org_id uuid not null references public.organizations(id), -- cliente dono do caso
  gatilho_data date,                 -- interno
  dilacao_dias int default 0,        -- interno
  urgente boolean default false,     -- interno
  created_by uuid default auth.uid(),
  created_at timestamptz default now()
);

-- Estado por fase da instância (o toggle vive aqui)
create table public.tl_instance_phases (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.tl_instances(id) on delete cascade,
  phase_id uuid not null references public.tl_phases(id),
  estado text not null default 'pendente' check (estado in ('pendente', 'ativa', 'concluida')),
  data_conclusao date,               -- interno
  prazo_calculado date,              -- interno (calculado; 2.ª iteração)
  notas_internas text,               -- interno
  unique (instance_id, phase_id)
);

create index idx_tl_phases_template on public.tl_phases (template_id, ordem);
create index idx_tl_instances_org on public.tl_instances (org_id);
create index idx_tl_instance_phases_instance on public.tl_instance_phases (instance_id);

-- ── RLS ──────────────────────────────────────────────────────
-- Advogados: acesso total via RLS. Clientes: SEM políticas de SELECT
-- direto (0 linhas) — o único caminho de leitura é via RPC tl_client_*.

alter table public.tl_templates enable row level security;
alter table public.tl_phases enable row level security;
alter table public.tl_instances enable row level security;
alter table public.tl_instance_phases enable row level security;

create policy tl_tpl_lawyer on public.tl_templates
  for all using (public.tl_is_lawyer()) with check (public.tl_is_lawyer());
create policy tl_phs_lawyer on public.tl_phases
  for all using (public.tl_is_lawyer()) with check (public.tl_is_lawyer());
create policy tl_inst_lawyer on public.tl_instances
  for all using (public.tl_is_lawyer()) with check (public.tl_is_lawyer());
create policy tl_iphs_lawyer on public.tl_instance_phases
  for all using (public.tl_is_lawyer()) with check (public.tl_is_lawyer());

-- ── Funções de acesso ────────────────────────────────────────

-- VISTA DO CLIENTE: sem prazo, sem datas. Só fases ativadas/concluídas
-- do seu próprio caso.
create or replace function public.tl_client_timeline(p_instance uuid)
returns table (ordem int, label text, tipo text, estado text)
language sql
stable
security definer
set search_path = public
as $$
  select p.ordem, p.label, p.tipo, ip.estado
  from public.tl_instance_phases ip
  join public.tl_phases p    on p.id = ip.phase_id
  join public.tl_instances i on i.id = ip.instance_id
  where ip.instance_id = p_instance
    and i.org_id = public.tl_org()             -- cliente só vê o seu org
    and ip.estado in ('ativa', 'concluida')    -- só o que o advogado ligou
  order by p.ordem;
$$;
revoke all on function public.tl_client_timeline(uuid) from public;
grant execute on function public.tl_client_timeline(uuid) to authenticated;

-- Listagem de casos do cliente (para o portal poder escolher a instância
-- sem acesso direto às tabelas). Mesmo princípio: nenhuma coluna de data.
create or replace function public.tl_client_instances()
returns table (instance_id uuid, matter_ref text, template_key text, template_title text)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.matter_ref, t.key, t.title
  from public.tl_instances i
  join public.tl_templates t on t.id = i.template_id
  where i.org_id = public.tl_org()
  order by i.created_at desc;
$$;
revoke all on function public.tl_client_instances() from public;
grant execute on function public.tl_client_instances() to authenticated;

-- VISTA DO ADVOGADO: tudo, incluindo prazo_calculado, base_legal e notas.
create or replace function public.tl_lawyer_timeline(p_instance uuid)
returns table (
  instance_phase_id uuid, ordem int, label text, tipo text,
  base_legal text, estado text, prazo_calculado date,
  data_conclusao date, is_optional boolean, confirmar boolean, notas text
)
language sql
stable
security definer
set search_path = public
as $$
  select ip.id, p.ordem, p.label, p.tipo, p.base_legal, ip.estado,
         ip.prazo_calculado, ip.data_conclusao, p.is_optional, p.confirmar, p.notas
  from public.tl_instance_phases ip
  join public.tl_phases p on p.id = ip.phase_id
  where ip.instance_id = p_instance and public.tl_is_lawyer()
  order by p.ordem;
$$;
revoke all on function public.tl_lawyer_timeline(uuid) from public;
grant execute on function public.tl_lawyer_timeline(uuid) to authenticated;

-- TOGGLE: só advogado. Ativar/concluir/repor uma fase.
create or replace function public.tl_set_phase(p_instance_phase uuid, p_estado text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.tl_is_lawyer() then
    raise exception 'not authorized';
  end if;
  if p_estado not in ('pendente', 'ativa', 'concluida') then
    raise exception 'estado invalido';
  end if;
  update public.tl_instance_phases
     set estado = p_estado,
         data_conclusao = case when p_estado = 'concluida' then current_date else null end
   where id = p_instance_phase;
end;
$$;
revoke all on function public.tl_set_phase(uuid, text) from public;
grant execute on function public.tl_set_phase(uuid, text) to authenticated;

notify pgrst, 'reload schema';
