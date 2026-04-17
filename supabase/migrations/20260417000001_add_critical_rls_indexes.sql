-- ============================================================
-- Migration: Critical indexes for RLS-filtered hot paths
--
-- Problem: many tables are filtered by `organization_id` and
-- `organization_members(user_id, organization_id)` in every RLS
-- policy. Without indexes, each authenticated read performs a
-- sequential scan, which does not scale beyond a few thousand rows.
--
-- This migration adds the indexes that the existing RLS policies
-- and helper functions (get_user_organization_id, get_user_org_role,
-- user_belongs_to_organization, fn_is_cca_internal_authorized)
-- depend on at runtime.
--
-- All indexes are created with IF NOT EXISTS so the migration is
-- safe to re-run and harmless on environments that may have
-- created some of them manually.
-- ============================================================

-- contratos: filtered by organization_id in every SELECT/UPDATE/INSERT policy
CREATE INDEX IF NOT EXISTS idx_contratos_organization_id
  ON public.contratos (organization_id);

-- contratos: common UI sorting + filtering
CREATE INDEX IF NOT EXISTS idx_contratos_org_estado
  ON public.contratos (organization_id, estado_contrato);

CREATE INDEX IF NOT EXISTS idx_contratos_org_updated_at
  ON public.contratos (organization_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_contratos_org_data_termo
  ON public.contratos (organization_id, data_termo)
  WHERE data_termo IS NOT NULL;

-- organization_members: hottest table in the schema (every RLS uses it)
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id
  ON public.organization_members (user_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_org_id
  ON public.organization_members (organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_members_user_org
  ON public.organization_members (user_id, organization_id);

-- profiles: lookups by current_organization_id are common
CREATE INDEX IF NOT EXISTS idx_profiles_current_organization_id
  ON public.profiles (current_organization_id)
  WHERE current_organization_id IS NOT NULL;

-- audit_logs: filtering by user + table is already indexed; add (org, created_at)
-- to support "all activity in org X over the last N days" queries efficiently.
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created_at
  ON public.audit_logs (organization_id, created_at DESC);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
