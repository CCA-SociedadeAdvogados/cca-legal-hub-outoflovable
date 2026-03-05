-- Fix RLS policies to grant platform_admins access to all org data
--
-- Problem: RLS policies on contratos, eventos_legislativos, impactos, politicas,
-- requisitos, templates, documentos_gerados, and audit_logs use:
--   organization_id = get_user_organization_id(auth.uid())
--
-- If profiles.current_organization_id is NULL (e.g. race condition during SSO,
-- DB trigger delay, or stale profile), this returns NULL and blocks ALL rows
-- silently — even for platform admins.
--
-- Fix: Add OR is_platform_admin(auth.uid()) to SELECT policies on core tables.
-- This ensures admins always see data. Non-admin access still requires
-- current_organization_id to be properly set.

-- ═══════════════════════════════════════════════════════════════════════
-- 1. contratos — SELECT
-- ═══════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view contracts in their organization" ON public.contratos;
CREATE POLICY "Users can view contracts in their organization"
  ON public.contratos FOR SELECT
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 2. eventos_legislativos — SELECT
-- ═══════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view eventos in their organization" ON public.eventos_legislativos;
CREATE POLICY "Users can view eventos in their organization"
  ON public.eventos_legislativos FOR SELECT
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 3. impactos — SELECT
-- ═══════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view impactos in their organization" ON public.impactos;
CREATE POLICY "Users can view impactos in their organization"
  ON public.impactos FOR SELECT
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 4. politicas — SELECT
-- ═══════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view politicas in their organization" ON public.politicas;
CREATE POLICY "Users can view politicas in their organization"
  ON public.politicas FOR SELECT
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 5. requisitos — SELECT
-- ═══════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view requisitos in their organization" ON public.requisitos;
CREATE POLICY "Users can view requisitos in their organization"
  ON public.requisitos FOR SELECT
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 6. templates — SELECT
-- ═══════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view templates in their organization" ON public.templates;
CREATE POLICY "Users can view templates in their organization"
  ON public.templates FOR SELECT
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 7. documentos_gerados — SELECT
-- ═══════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Users can view documentos in their organization" ON public.documentos_gerados;
CREATE POLICY "Users can view documentos in their organization"
  ON public.documentos_gerados FOR SELECT
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════
-- 8. Also fix INSERT/UPDATE/DELETE policies for admins on contratos
--    so they can manage contracts across orgs
-- ═══════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Editors can insert contracts" ON public.contratos;
CREATE POLICY "Editors can insert contracts"
  ON public.contratos FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Editors can update contracts" ON public.contratos;
CREATE POLICY "Editors can update contracts"
  ON public.contratos FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    OR public.is_platform_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete contracts" ON public.contratos;
CREATE POLICY "Admins can delete contracts"
  ON public.contratos FOR DELETE
  USING (
    (organization_id = public.get_user_organization_id(auth.uid())
     AND public.get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::public.app_role, 'admin'::public.app_role]))
    OR public.is_platform_admin(auth.uid())
  );
