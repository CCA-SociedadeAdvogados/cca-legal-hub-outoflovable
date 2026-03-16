-- ============================================================
-- Migration: funções de autorização e leitura financeira por actor
--
-- Exportadas da BD de produção via pg_get_functiondef.
-- Dependências: organizations, organizations_legacy,
--               financeiro_nav_items, organization_members, profiles,
--               vw_client_finance_home_by_organization.
-- ============================================================

-- ── 1. fn_is_cca_internal_authorized ──────────────────────────────
-- Determina se um utilizador é staff CCA autorizado para acesso
-- transversal a todos os clientes activos da plataforma.

CREATE OR REPLACE FUNCTION public.fn_is_cca_internal_authorized(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $function$
  select exists (
    select 1
    from public.organization_members om
    join public.organizations o
      on o.id = om.organization_id
    join public.profiles p
      on p.id = om.user_id
    where om.user_id = p_user_id
      and o.client_code = 'C.0000'
      and o.org_type = 'cca_owner'
      and lower(p.email) in (
        'al@cca.law',
        'asilva@cca.law',
        'jm@cca.law',
        'lfgaspar@cca.law'
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.fn_is_cca_internal_authorized(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_is_cca_internal_authorized(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_is_cca_internal_authorized(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_cca_internal_authorized(uuid) TO service_role;

-- ── 2. fn_get_client_home_for_actor ───────────────────────────────
-- Devolve homepage financeira de um cliente em visualização,
-- validando autorização do actor (CCA interno ou membro externo).

CREATE OR REPLACE FUNCTION public.fn_get_client_home_for_actor(
    p_user_id uuid,
    p_viewing_organization_id uuid
)
RETURNS TABLE(
    organization_id uuid,
    client_code text,
    organization_name text,
    legacy_client_name text,
    group_code text,
    cost_center text,
    responsible text,
    responsible_email text,
    total_documentos bigint,
    total_pendente numeric,
    total_vencido numeric,
    total_a_vencer numeric,
    ultima_sincronizacao timestamp with time zone
)
LANGUAGE sql
STABLE
AS $function$
  with authorized_orgs as (
    select o.id as organization_id
    from public.organizations o
    where public.fn_is_cca_internal_authorized(p_user_id)
      and o.org_type = 'client'
    union
    select om.organization_id
    from public.organization_members om
    join public.organizations o
      on o.id = om.organization_id
    where om.user_id = p_user_id
      and o.org_type = 'client'
  )
  select
    v.organization_id,
    v.client_code,
    v.organization_name,
    v.legacy_client_name,
    v.group_code,
    v.cost_center,
    v.responsible,
    v.responsible_email,
    v.total_documentos,
    v.total_pendente,
    v.total_vencido,
    v.total_a_vencer,
    v.ultima_sincronizacao
  from public.vw_client_finance_home_by_organization v
  join authorized_orgs a
    on a.organization_id = v.organization_id
  where v.organization_id = p_viewing_organization_id;
$function$;

REVOKE ALL ON FUNCTION public.fn_get_client_home_for_actor(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_client_home_for_actor(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_get_client_home_for_actor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_client_home_for_actor(uuid, uuid) TO service_role;

-- ── 3. fn_get_financial_items_for_actor ───────────────────────────
-- Devolve documentos financeiros individuais do cliente em visualização.
-- Aplica regra de grupo: owner externo vê entidades do mesmo grupo;
-- CCA interno vê tudo; outros vêem apenas a sua entidade.

CREATE OR REPLACE FUNCTION public.fn_get_financial_items_for_actor(
    p_user_id uuid,
    p_viewing_organization_id uuid
)
RETURNS TABLE(
    organization_id uuid,
    client_code text,
    organization_name text,
    legacy_client_name text,
    group_code text,
    numero_documento text,
    descricao text,
    valor numeric,
    data_vencimento date,
    estado text,
    synced_at timestamp with time zone
)
LANGUAGE sql
STABLE
AS $function$
  with target_org as (
    select
      o.id as organization_id,
      o.client_code,
      o.name as organization_name,
      ol.name as legacy_client_name,
      ol."group" as group_code
    from public.organizations o
    left join public.organizations_legacy ol
      on ol.client_code = o.client_code
    where o.id = p_viewing_organization_id
      and o.org_type = 'client'
  ),
  actor_is_cca as (
    select public.fn_is_cca_internal_authorized(p_user_id) as is_cca
  ),
  actor_external_scope as (
    select
      o.id as organization_id,
      o.client_code,
      ol."group" as group_code,
      om.role
    from public.organization_members om
    join public.organizations o
      on o.id = om.organization_id
    left join public.organizations_legacy ol
      on ol.client_code = o.client_code
    where om.user_id = p_user_id
      and o.org_type = 'client'
  ),
  allowed_client_codes as (
    -- CCA interno: acesso directo ao client_code do target
    select t.client_code
    from target_org t
    cross join actor_is_cca a
    where a.is_cca = true
    union
    -- Externo: acesso à própria entidade
    select t.client_code
    from target_org t
    join actor_external_scope s
      on s.organization_id = t.organization_id
    union
    -- Externo owner: acesso às entidades do mesmo grupo
    select o2.client_code
    from target_org t
    join actor_external_scope s
      on s.organization_id = t.organization_id
    join public.organizations o2
      on o2.org_type = 'client'
    left join public.organizations_legacy ol2
      on ol2.client_code = o2.client_code
    where s.role = 'owner'
      and s.group_code is not null
      and s.group_code <> 'NAO'
      and ol2."group" = s.group_code
  )
  select
    t.organization_id,
    t.client_code,
    t.organization_name,
    t.legacy_client_name,
    t.group_code,
    f.numero_documento,
    f.descricao,
    f.valor,
    f.data_vencimento,
    case
      when f.data_vencimento < current_date then 'vencido'
      else 'a_vencer'
    end as estado,
    f.synced_at
  from target_org t
  join allowed_client_codes ac
    on ac.client_code = t.client_code
  join public.financeiro_nav_items f
    on f.jvris_id = t.client_code
  order by
    f.data_vencimento asc nulls last,
    f.numero_documento asc nulls last;
$function$;

REVOKE ALL ON FUNCTION public.fn_get_financial_items_for_actor(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_financial_items_for_actor(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_get_financial_items_for_actor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_financial_items_for_actor(uuid, uuid) TO service_role;

-- ── 4. fn_get_financial_summary_for_actor ─────────────────────────
-- Resumo financeiro agregado, calculado a partir dos items do actor.

CREATE OR REPLACE FUNCTION public.fn_get_financial_summary_for_actor(
    p_user_id uuid,
    p_viewing_organization_id uuid
)
RETURNS TABLE(
    organization_id uuid,
    client_code text,
    organization_name text,
    legacy_client_name text,
    group_code text,
    total_documentos bigint,
    total_pendente numeric,
    total_vencido numeric,
    total_a_vencer numeric,
    ultima_sincronizacao timestamp with time zone
)
LANGUAGE sql
STABLE
AS $function$
  with items as (
    select *
    from public.fn_get_financial_items_for_actor(
      p_user_id,
      p_viewing_organization_id
    )
  )
  select
    i.organization_id,
    i.client_code,
    i.organization_name,
    i.legacy_client_name,
    i.group_code,
    count(*) as total_documentos,
    coalesce(sum(i.valor), 0) as total_pendente,
    coalesce(sum(case when i.estado = 'vencido' then i.valor else 0 end), 0) as total_vencido,
    coalesce(sum(case when i.estado = 'a_vencer' then i.valor else 0 end), 0) as total_a_vencer,
    max(i.synced_at) as ultima_sincronizacao
  from items i
  group by
    i.organization_id,
    i.client_code,
    i.organization_name,
    i.legacy_client_name,
    i.group_code;
$function$;

REVOKE ALL ON FUNCTION public.fn_get_financial_summary_for_actor(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_financial_summary_for_actor(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_get_financial_summary_for_actor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_financial_summary_for_actor(uuid, uuid) TO service_role;

-- ── 5. fn_get_financial_summary_by_entity_for_actor ───────────────
-- Resumo financeiro por entidade (grupo económico), com lógica
-- de autorização dual (CCA interno vs externo owner vs outros).

CREATE OR REPLACE FUNCTION public.fn_get_financial_summary_by_entity_for_actor(
    p_user_id uuid,
    p_viewing_organization_id uuid
)
RETURNS TABLE(
    entity_organization_id uuid,
    entity_client_code text,
    entity_name text,
    group_code text,
    total_documentos bigint,
    total_pendente numeric,
    total_vencido numeric,
    total_a_vencer numeric,
    ultima_sincronizacao timestamp with time zone
)
LANGUAGE sql
STABLE
AS $function$
  with target_org as (
    select
      o.id as organization_id,
      o.client_code,
      o.name as organization_name,
      ol."group" as group_code
    from public.organizations o
    left join public.organizations_legacy ol
      on ol.client_code = o.client_code
    where o.id = p_viewing_organization_id
      and o.org_type = 'client'
  ),
  actor_is_cca as (
    select public.fn_is_cca_internal_authorized(p_user_id) as is_cca
  ),
  actor_external_scope as (
    select
      o.id as organization_id,
      o.client_code,
      ol."group" as group_code,
      om.role
    from public.organization_members om
    join public.organizations o
      on o.id = om.organization_id
    left join public.organizations_legacy ol
      on ol.client_code = o.client_code
    where om.user_id = p_user_id
      and o.org_type = 'client'
  ),
  allowed_entities as (
    -- CCA interno: vê entidades do mesmo grupo (ou só a entidade se sem grupo)
    select
      o.id as entity_organization_id,
      o.client_code as entity_client_code,
      o.name as entity_name,
      ol."group" as group_code
    from target_org t
    cross join actor_is_cca a
    join public.organizations o
      on o.org_type = 'client'
    left join public.organizations_legacy ol
      on ol.client_code = o.client_code
    where a.is_cca = true
      and (
        coalesce(t.group_code, 'NAO') = 'NAO'
        and o.id = t.organization_id
        or coalesce(t.group_code, 'NAO') <> 'NAO'
        and ol."group" = t.group_code
      )
    union
    -- Externo: vê a própria entidade
    select
      o.id as entity_organization_id,
      o.client_code as entity_client_code,
      o.name as entity_name,
      ol."group" as group_code
    from target_org t
    join actor_external_scope s
      on s.organization_id = t.organization_id
    join public.organizations o
      on o.id = t.organization_id
    left join public.organizations_legacy ol
      on ol.client_code = o.client_code
    union
    -- Externo owner: vê entidades do mesmo grupo
    select
      o.id as entity_organization_id,
      o.client_code as entity_client_code,
      o.name as entity_name,
      ol."group" as group_code
    from target_org t
    join actor_external_scope s
      on s.organization_id = t.organization_id
    join public.organizations o
      on o.org_type = 'client'
    left join public.organizations_legacy ol
      on ol.client_code = o.client_code
    where s.role = 'owner'
      and s.group_code is not null
      and s.group_code <> 'NAO'
      and ol."group" = s.group_code
  )
  select
    ae.entity_organization_id,
    ae.entity_client_code,
    ae.entity_name,
    ae.group_code,
    count(f.*) as total_documentos,
    coalesce(sum(f.valor), 0) as total_pendente,
    coalesce(sum(case when f.data_vencimento < current_date then f.valor else 0 end), 0) as total_vencido,
    coalesce(sum(case when f.data_vencimento >= current_date then f.valor else 0 end), 0) as total_a_vencer,
    max(f.synced_at) as ultima_sincronizacao
  from allowed_entities ae
  left join public.financeiro_nav_items f
    on f.jvris_id = ae.entity_client_code
  group by
    ae.entity_organization_id,
    ae.entity_client_code,
    ae.entity_name,
    ae.group_code
  order by ae.entity_name;
$function$;

REVOKE ALL ON FUNCTION public.fn_get_financial_summary_by_entity_for_actor(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_financial_summary_by_entity_for_actor(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_get_financial_summary_by_entity_for_actor(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_financial_summary_by_entity_for_actor(uuid, uuid) TO service_role;

-- ── 6. Reload PostgREST schema cache ──────────────────────────────
NOTIFY pgrst, 'reload schema';
