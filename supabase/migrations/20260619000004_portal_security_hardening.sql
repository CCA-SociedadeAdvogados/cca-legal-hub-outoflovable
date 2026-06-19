-- Endurecimento de segurança do portal — fecha fugas entre organizações
-- (cross-tenant) confirmadas pelos advisors do Supabase.
-- Mantém o comportamento atual do cockpit e do portal (acesso scopado por org).
-- Nota: o helper is_cca_user é garantido na migração 20260619000001 (anterior).

-- ── 1. contract_extractions: substituir políticas "sempre verdadeiras" ────────
-- Antes: SELECT/INSERT/UPDATE/DELETE com using(true) → qualquer autenticado lia
-- e modificava extrações de TODAS as organizações. Agora scopado pela org do
-- contrato associado (membros da org, utilizadores CCA ou platform admin).
DROP POLICY IF EXISTS ce_select ON public.contract_extractions;
DROP POLICY IF EXISTS ce_insert ON public.contract_extractions;
DROP POLICY IF EXISTS ce_update ON public.contract_extractions;
DROP POLICY IF EXISTS ce_delete ON public.contract_extractions;

CREATE POLICY ce_select ON public.contract_extractions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.contratos c
  WHERE c.id = contract_extractions.contrato_id
    AND (is_platform_admin(auth.uid()) OR is_cca_user(auth.uid())
         OR c.organization_id = get_user_organization_id(auth.uid()))
));

CREATE POLICY ce_insert ON public.contract_extractions FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.contratos c
  WHERE c.id = contract_extractions.contrato_id
    AND (is_platform_admin(auth.uid()) OR is_cca_user(auth.uid())
         OR c.organization_id = get_user_organization_id(auth.uid()))
));

CREATE POLICY ce_update ON public.contract_extractions FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.contratos c
  WHERE c.id = contract_extractions.contrato_id
    AND (is_platform_admin(auth.uid()) OR is_cca_user(auth.uid())
         OR c.organization_id = get_user_organization_id(auth.uid()))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.contratos c
  WHERE c.id = contract_extractions.contrato_id
    AND (is_platform_admin(auth.uid()) OR is_cca_user(auth.uid())
         OR c.organization_id = get_user_organization_id(auth.uid()))
));

CREATE POLICY ce_delete ON public.contract_extractions FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.contratos c
  WHERE c.id = contract_extractions.contrato_id
    AND (is_platform_admin(auth.uid()) OR is_cca_user(auth.uid())
         OR c.organization_id = get_user_organization_id(auth.uid()))
));

-- ── 2. financeiro_nav_cache: remover política ALL pública "sempre verdadeira" ──
-- A política dava acesso total a todos os papéis (incl. authenticated/anon).
-- A service role ignora RLS, por isso a sincronização (sync-nav-excel) continua
-- a escrever. Fica apenas a SELECT scopada por organização já existente.
DROP POLICY IF EXISTS "Service role can manage nav cache" ON public.financeiro_nav_cache;

-- ── 3. Tabelas sensíveis sem RLS → ativar (apenas service role lhes acede) ─────
-- Estas tabelas existem em produção mas não são criadas pelo conjunto de
-- migrações; agir apenas se existirem (robusto também numa build de raiz).
DO $$
BEGIN
  -- email_mfa_codes: códigos MFA — nunca acedido pelo cliente.
  IF to_regclass('public.email_mfa_codes') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.email_mfa_codes ENABLE ROW LEVEL SECURITY';
  END IF;

  -- user_invites / users_import: convite/importação — só platform admin.
  IF to_regclass('public.user_invites') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS user_invites_admin_all ON public.user_invites';
    EXECUTE 'CREATE POLICY user_invites_admin_all ON public.user_invites FOR ALL TO authenticated USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()))';
  END IF;

  IF to_regclass('public.users_import') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.users_import ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS users_import_admin_all ON public.users_import';
    EXECUTE 'CREATE POLICY users_import_admin_all ON public.users_import FOR ALL TO authenticated USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()))';
  END IF;
END $$;

-- ── 4. Views SECURITY DEFINER financeiras: tirar do acesso direto via API ──────
-- Estas views ignoram RLS. Não são consultadas diretamente pelo cliente (só
-- pelas RPCs fn_get_*_for_actor, que correm como owner). Revogar o SELECT a
-- anon/authenticated impede a leitura cross-tenant via PostgREST sem afetar as RPCs.
REVOKE SELECT ON public.vw_client_finance_home FROM anon, authenticated;
REVOKE SELECT ON public.vw_client_finance_home_by_organization FROM anon, authenticated;
REVOKE SELECT ON public.vw_organization_members_financial_scope FROM anon, authenticated;

-- NOTA: vw_cca_client_catalog_overview também é SECURITY DEFINER mas é consultada
-- diretamente pelo cliente (useOrganizations). Requer refactor cuidado (gate por
-- utilizador CCA + security_invoker) — tratado em migração futura para não
-- quebrar o catálogo de clientes.
