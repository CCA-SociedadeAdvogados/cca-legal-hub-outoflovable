-- ============================================================
-- Migration: criar cliente C.0001 (CCA - Sociedade de Advogados)
--
-- Objectivo: a CCA precisa de uma organização-cliente própria para
-- que os utilizadores internos CCA tenham, logo ao fazer login SSO,
-- um cliente por defeito em visualização — a própria CCA.
--
-- C.0000 é a org identitária (cca_owner) — nunca troca.
-- C.0001 é a org-cliente da CCA — aparece no catálogo e no selector.
--
-- Passos:
--   1. Inserir C.0001 em organizations_legacy (catálogo)
--   2. Criar org em organizations (org_type = 'client')
--   3. Copiar todos os membros de C.0000 para C.0001
--   4. Criar função fn_get_cca_default_client_org_id()
-- ============================================================

-- ── 1. Inserir no catálogo legacy ────────────────────────────────
-- organizations_legacy.id é integer sem default — calcular o próximo
INSERT INTO public.organizations_legacy (id, client_code, name, is_active)
SELECT COALESCE(MAX(id), 0) + 1, 'C.0001', 'CCA - Sociedade de Advogados', true
FROM public.organizations_legacy
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations_legacy WHERE client_code = 'C.0001'
);

-- ── 2. Criar a organização-cliente ───────────────────────────────
-- A tabela organizations não tem coluna slug — apenas name, client_code, org_type
INSERT INTO public.organizations (id, name, client_code, org_type, is_active)
SELECT
  gen_random_uuid(),
  'CCA - Sociedade de Advogados',
  'C.0001',
  'client',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.organizations
  WHERE client_code = 'C.0001' AND org_type = 'client'
);

-- ── 3. Copiar membros da org CCA (C.0000) para C.0001 ───────────
-- Todos os utilizadores internos CCA ficam automaticamente com acesso
-- ao cliente C.0001 com o mesmo role que têm na org identitária.
DO $$
DECLARE
  v_cca_owner_id uuid;
  v_cca_client_id uuid;
BEGIN
  SELECT id INTO v_cca_owner_id
  FROM public.organizations
  WHERE client_code = 'C.0000' AND org_type = 'cca_owner'
  LIMIT 1;

  SELECT id INTO v_cca_client_id
  FROM public.organizations
  WHERE client_code = 'C.0001' AND org_type = 'client'
  LIMIT 1;

  IF v_cca_owner_id IS NULL THEN
    RAISE NOTICE 'Org CCA owner (C.0000) não encontrada — skip member copy';
    RETURN;
  END IF;

  IF v_cca_client_id IS NULL THEN
    RAISE NOTICE 'Org CCA client (C.0001) não encontrada — skip member copy';
    RETURN;
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  SELECT v_cca_client_id, om.user_id, om.role
  FROM public.organization_members om
  WHERE om.organization_id = v_cca_owner_id
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_members existing
      WHERE existing.organization_id = v_cca_client_id
        AND existing.user_id = om.user_id
    );

  RAISE NOTICE 'Membros copiados de C.0000 para C.0001';
END;
$$;

-- ── 4. Função auxiliar: obter org_id do cliente CCA (C.0001) ────
-- Usada pelo SSO e pelo frontend para determinar o cliente por defeito.
CREATE OR REPLACE FUNCTION public.fn_get_cca_default_client_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.organizations
  WHERE client_code = 'C.0001'
    AND org_type = 'client'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.fn_get_cca_default_client_org_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_cca_default_client_org_id() TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_get_cca_default_client_org_id() TO authenticated;

NOTIFY pgrst, 'reload schema';
