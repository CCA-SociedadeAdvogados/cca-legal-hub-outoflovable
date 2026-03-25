-- ============================================================
-- Migration: Restringir RLS em tabelas com policies demasiado permissivas
--
-- 1. organizations_legacy — restringir a utilizadores CCA internos
-- 2. financeiro_nav_cache — restringir a membros da org ou CCA internos
-- 3. financeiro_nav_items — restringir a membros da org ou CCA internos
-- ============================================================

-- ── Helper: verificar se o utilizador é CCA interno autorizado ──
-- Reutiliza fn_is_cca_internal_authorized já existente.

-- ── 1. organizations_legacy — só CCA internos podem ler ────────
DROP POLICY IF EXISTS "Authenticated users can read organizations_legacy"
  ON public.organizations_legacy;

CREATE POLICY "CCA internal users can read organizations_legacy"
  ON public.organizations_legacy FOR SELECT TO authenticated
  USING (
    public.fn_is_cca_internal_authorized(auth.uid())
  );

-- ── 2. financeiro_nav_cache — membros da org ou CCA internos ───
DROP POLICY IF EXISTS "Authenticated users can read nav cache"
  ON public.financeiro_nav_cache;

CREATE POLICY "Org members or CCA users can read nav cache"
  ON public.financeiro_nav_cache FOR SELECT TO authenticated
  USING (
    public.fn_is_cca_internal_authorized(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      JOIN public.organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND o.client_code = financeiro_nav_cache.jvris_id
    )
  );

-- ── 3. financeiro_nav_items — membros da org ou CCA internos ───
DROP POLICY IF EXISTS "Authenticated users can read nav items"
  ON public.financeiro_nav_items;

CREATE POLICY "Org members or CCA users can read nav items"
  ON public.financeiro_nav_items FOR SELECT TO authenticated
  USING (
    public.fn_is_cca_internal_authorized(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      JOIN public.organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND o.client_code = financeiro_nav_items.jvris_id
    )
  );

-- ── Reload PostgREST schema cache ──────────────────────────────
NOTIFY pgrst, 'reload schema';
