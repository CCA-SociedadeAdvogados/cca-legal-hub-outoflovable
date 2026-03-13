-- ============================================================
-- Migration: views financeiras e de catálogo
--
-- Exportadas da BD de produção via pg_views.
-- Dependências: organizations, organizations_legacy,
--               financeiro_nav_items, organization_members, profiles.
-- ============================================================

-- ── 1. vw_organization_members_financial_scope ────────────────────

CREATE OR REPLACE VIEW public.vw_organization_members_financial_scope AS
SELECT
    om.user_id,
    p.email,
    om.organization_id,
    om.role,
    (om.role = 'owner'::app_role) AS can_view_group_financials
FROM organization_members om
JOIN profiles p ON p.id = om.user_id;

GRANT SELECT ON public.vw_organization_members_financial_scope TO authenticated;

-- ── 2. vw_client_finance_home ─────────────────────────────────────

CREATE OR REPLACE VIEW public.vw_client_finance_home AS
SELECT
    o.id AS organization_id,
    o.client_code,
    o.name AS organization_name,
    ol.name AS legacy_client_name,
    ol."group" AS group_code,
    ol.cost_center,
    ol.responsible,
    ol.responsible_email,
    count(fni.id) AS total_documentos,
    COALESCE(sum(fni.valor), (0)::numeric) AS total_pendente,
    COALESCE(sum(
        CASE
            WHEN fni.data_vencimento < CURRENT_DATE THEN fni.valor
            ELSE (0)::numeric
        END), (0)::numeric) AS total_vencido,
    COALESCE(sum(
        CASE
            WHEN fni.data_vencimento >= CURRENT_DATE THEN fni.valor
            ELSE (0)::numeric
        END), (0)::numeric) AS total_a_vencer,
    max(fni.synced_at) AS ultima_sincronizacao
FROM organizations o
LEFT JOIN organizations_legacy ol ON ol.client_code = o.client_code
LEFT JOIN financeiro_nav_items fni ON fni.jvris_id = o.client_code
GROUP BY o.id, o.client_code, o.name, ol.name, ol."group",
         ol.cost_center, ol.responsible, ol.responsible_email;

GRANT SELECT ON public.vw_client_finance_home TO authenticated;

-- ── 3. vw_client_finance_home_by_organization ─────────────────────

CREATE OR REPLACE VIEW public.vw_client_finance_home_by_organization AS
SELECT
    o.id AS organization_id,
    o.client_code,
    o.name AS organization_name,
    ol.name AS legacy_client_name,
    ol."group" AS group_code,
    ol.cost_center,
    ol.responsible,
    ol.responsible_email,
    count(f.*) AS total_documentos,
    COALESCE(sum(f.valor), (0)::numeric) AS total_pendente,
    COALESCE(sum(
        CASE
            WHEN f.data_vencimento < CURRENT_DATE THEN f.valor
            ELSE (0)::numeric
        END), (0)::numeric) AS total_vencido,
    COALESCE(sum(
        CASE
            WHEN f.data_vencimento >= CURRENT_DATE THEN f.valor
            ELSE (0)::numeric
        END), (0)::numeric) AS total_a_vencer,
    max(f.synced_at) AS ultima_sincronizacao
FROM organizations o
LEFT JOIN organizations_legacy ol ON ol.client_code = o.client_code
LEFT JOIN financeiro_nav_items f ON f.jvris_id = o.client_code
WHERE o.client_code IS NOT NULL
  AND o.client_code <> 'C.0000'
  AND o.org_type = 'client'
GROUP BY o.id, o.client_code, o.name, ol.name, ol."group",
         ol.cost_center, ol.responsible, ol.responsible_email;

GRANT SELECT ON public.vw_client_finance_home_by_organization TO authenticated;

-- ── 4. vw_cca_client_catalog_overview ─────────────────────────────

CREATE OR REPLACE VIEW public.vw_cca_client_catalog_overview AS
WITH orgs AS (
    SELECT
        o_1.client_code,
        (min((o_1.id)::text))::uuid AS organization_id,
        string_agg(DISTINCT o_1.name, ' | ' ORDER BY o_1.name) AS organization_name,
        bool_or(COALESCE(o_1.is_active, true)) AS organization_is_active,
        count(*) AS organization_count
    FROM organizations o_1
    WHERE o_1.client_code IS NOT NULL
      AND o_1.client_code <> 'C.0000'
    GROUP BY o_1.client_code
),
members AS (
    SELECT
        o_1.client_code,
        count(*) AS total_members,
        count(DISTINCT om.user_id) AS distinct_users,
        count(*) FILTER (WHERE om.role = 'owner'::app_role) AS total_owners,
        count(*) FILTER (WHERE om.role = 'admin'::app_role) AS total_admins,
        count(*) FILTER (WHERE om.role = 'editor'::app_role) AS total_editors,
        count(*) FILTER (WHERE om.role = 'viewer'::app_role) AS total_viewers
    FROM organization_members om
    JOIN organizations o_1 ON o_1.id = om.organization_id
    WHERE o_1.client_code IS NOT NULL
      AND o_1.client_code <> 'C.0000'
    GROUP BY o_1.client_code
),
finance AS (
    SELECT
        f_1.jvris_id AS client_code,
        count(*) AS total_documentos,
        COALESCE(sum(f_1.valor), (0)::numeric) AS total_pendente,
        COALESCE(sum(
            CASE
                WHEN f_1.data_vencimento < CURRENT_DATE THEN f_1.valor
                ELSE (0)::numeric
            END), (0)::numeric) AS total_vencido,
        COALESCE(sum(
            CASE
                WHEN f_1.data_vencimento >= CURRENT_DATE THEN f_1.valor
                ELSE (0)::numeric
            END), (0)::numeric) AS total_a_vencer,
        min(f_1.data_vencimento) AS primeira_data_vencimento,
        max(f_1.data_vencimento) AS ultima_data_vencimento,
        max(f_1.synced_at) AS ultima_sincronizacao
    FROM financeiro_nav_items f_1
    WHERE f_1.jvris_id IS NOT NULL
    GROUP BY f_1.jvris_id
)
SELECT
    ol.client_code,
    ol.name AS legacy_client_name,
    ol."group" AS group_code,
    ol.cost_center,
    ol.responsible,
    ol.responsible_email,
    COALESCE(ol.is_active, true) AS legacy_is_active,
    o.organization_id,
    o.organization_name,
    o.organization_is_active,
    COALESCE(o.organization_count, (0)::bigint) AS organization_count,
    COALESCE(m.total_members, (0)::bigint) AS total_members,
    COALESCE(m.distinct_users, (0)::bigint) AS distinct_users,
    COALESCE(m.total_owners, (0)::bigint) AS total_owners,
    COALESCE(m.total_admins, (0)::bigint) AS total_admins,
    COALESCE(m.total_editors, (0)::bigint) AS total_editors,
    COALESCE(m.total_viewers, (0)::bigint) AS total_viewers,
    COALESCE(f.total_documentos, (0)::bigint) AS total_documentos,
    COALESCE(f.total_pendente, (0)::numeric) AS total_pendente,
    COALESCE(f.total_vencido, (0)::numeric) AS total_vencido,
    COALESCE(f.total_a_vencer, (0)::numeric) AS total_a_vencer,
    f.primeira_data_vencimento,
    f.ultima_data_vencimento,
    f.ultima_sincronizacao,
    CASE
        WHEN o.organization_id IS NOT NULL THEN true
        ELSE false
    END AS has_platform_tenant,
    CASE
        WHEN COALESCE(f.total_documentos, (0)::bigint) > 0 THEN true
        ELSE false
    END AS has_financial_data,
    CASE
        WHEN o.organization_id IS NOT NULL AND COALESCE(o.organization_is_active, true) THEN true
        ELSE false
    END AS can_open_in_platform,
    CASE
        WHEN o.organization_id IS NOT NULL AND COALESCE(o.organization_is_active, true)
             AND COALESCE(f.total_documentos, (0)::bigint) > 0
            THEN 'tenant_activo_com_financeiro'
        WHEN o.organization_id IS NOT NULL AND COALESCE(o.organization_is_active, true)
            THEN 'tenant_activo_sem_financeiro'
        WHEN o.organization_id IS NOT NULL
            THEN 'tenant_inactivo'
        WHEN COALESCE(f.total_documentos, (0)::bigint) > 0
            THEN 'catalogo_com_financeiro_sem_tenant'
        ELSE 'catalogo_sem_tenant'
    END AS client_status
FROM organizations_legacy ol
LEFT JOIN orgs o ON o.client_code = ol.client_code
LEFT JOIN members m ON m.client_code = ol.client_code
LEFT JOIN finance f ON f.client_code = ol.client_code
WHERE ol.client_code IS NOT NULL
  AND ol.client_code <> 'C.0000'
ORDER BY ol.client_code;

GRANT SELECT ON public.vw_cca_client_catalog_overview TO authenticated;

-- ── 5. Reload PostgREST schema cache ──────────────────────────────
NOTIFY pgrst, 'reload schema';
