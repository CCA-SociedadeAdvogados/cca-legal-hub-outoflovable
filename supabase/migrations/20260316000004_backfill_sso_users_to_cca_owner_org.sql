-- ============================================================
-- Migration: backfill utilizadores SSO para a org CCA real (C.0000)
--
-- Problema: o SSO callback estava a atribuir utilizadores à org "CCA_Teste"
-- (id: e33bf0c9-71b9-491b-8054-d4c88d8bb4ee) em vez da org CCA real
-- (client_code = 'C.0000', org_type = 'cca_owner').
--
-- Como fn_is_cca_internal_authorized verifica membership em C.0000,
-- estes utilizadores nunca passavam a verificação de autorização.
--
-- Fix:
-- 1. Adicionar membership na org C.0000 para todos os utilizadores SSO
--    que estão em CCA_Teste mas não estão na org real.
-- 2. Actualizar current_organization_id para apontar para a org C.0000
--    nos utilizadores SSO que ainda apontam para CCA_Teste.
-- ============================================================

DO $$
DECLARE
  v_cca_org_id uuid;
  v_cca_teste_id uuid := 'e33bf0c9-71b9-491b-8054-d4c88d8bb4ee';
BEGIN

  -- Encontrar a org CCA real
  SELECT id INTO v_cca_org_id
  FROM public.organizations
  WHERE client_code = 'C.0000'
    AND org_type = 'cca_owner'
  LIMIT 1;

  IF v_cca_org_id IS NULL THEN
    RAISE WARNING '[backfill] Org CCA (C.0000 / cca_owner) não encontrada — migration ignorada';
    RETURN;
  END IF;

  IF v_cca_org_id = v_cca_teste_id THEN
    RAISE NOTICE '[backfill] CCA_Teste IS a org CCA real (mesmo ID) — apenas actualizar function, sem backfill necessário';
    RETURN;
  END IF;

  RAISE NOTICE '[backfill] Org CCA real: %, CCA_Teste: %', v_cca_org_id, v_cca_teste_id;

  -- ── 1. Adicionar membership na org real para utilizadores SSO em CCA_Teste ──
  INSERT INTO public.organization_members (organization_id, user_id, role)
  SELECT
    v_cca_org_id,
    om.user_id,
    om.role
  FROM public.organization_members om
  JOIN public.profiles p ON p.id = om.user_id
  WHERE om.organization_id = v_cca_teste_id
    AND p.auth_method = 'sso_cca'
    AND NOT EXISTS (
      SELECT 1 FROM public.organization_members om2
      WHERE om2.user_id = om.user_id
        AND om2.organization_id = v_cca_org_id
    )
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_cca_org_id = ROW_COUNT;
  RAISE NOTICE '[backfill] % utilizadores SSO adicionados à org CCA real', v_cca_org_id;

  -- ── 2. Actualizar current_organization_id: CCA_Teste → org real ──────────
  UPDATE public.profiles p
  SET current_organization_id = (
    SELECT id FROM public.organizations
    WHERE client_code = 'C.0000' AND org_type = 'cca_owner'
    LIMIT 1
  )
  WHERE p.auth_method = 'sso_cca'
    AND p.current_organization_id = v_cca_teste_id;

  GET DIAGNOSTICS v_cca_org_id = ROW_COUNT;
  RAISE NOTICE '[backfill] % perfis SSO actualizados (current_organization_id)', v_cca_org_id;

END $$;

NOTIFY pgrst, 'reload schema';
