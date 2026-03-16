-- ============================================================
-- Migration: auto-provisioning de organizações a partir do catálogo NAV
--
-- Problema: clientes existem em organizations_legacy (e têm dados em
-- financeiro_nav_items) mas não têm registo em organizations →
-- can_open_in_platform=false → RPCs financeiros não funcionam.
--
-- Solução:
--   1. fn_provision_org_for_client_code  — cria org idempotentemente
--   2. fn_provision_orgs_for_client_codes — batch (chamada pelo edge function)
--   3. Backfill único para os ~3211 clientes já existentes sem org
--
-- Após esta migration, o edge function sync-nav-excel chama a função
-- batch sempre que sincroniza, garantindo que novos clientes NAV ficam
-- automaticamente activos na plataforma.
-- ============================================================

-- ── 1. fn_provision_org_for_client_code ──────────────────────────
-- Cria uma organization para o client_code dado, caso não exista.
-- Idempotente — se já existir, devolve o id existente sem alterar nada.
-- Usa metadata de organizations_legacy (nome, grupo, responsável, etc.)

CREATE OR REPLACE FUNCTION public.fn_provision_org_for_client_code(p_client_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id        uuid;
  v_name          text;
  v_group         text;
  v_cost_center   text;
  v_responsible   text;
  v_resp_email    text;
  v_slug_base     text;
  v_slug          text;
  v_counter       int := 0;
BEGIN
  -- Devolver org existente se já estiver provisionada
  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE client_code = p_client_code
    AND org_type = 'client'
  LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  -- Obter metadata do catálogo legacy
  SELECT
    COALESCE(name, p_client_code),
    "group",
    cost_center,
    responsible,
    responsible_email
  INTO v_name, v_group, v_cost_center, v_responsible, v_resp_email
  FROM public.organizations_legacy
  WHERE client_code = p_client_code
  LIMIT 1;

  -- Fallback: se o cliente não existir ainda em organizations_legacy
  v_name := COALESCE(v_name, p_client_code);

  -- Gerar slug a partir do client_code (ex.: C.0009 → c-0009)
  v_slug_base := lower(regexp_replace(p_client_code, '[^a-z0-9]', '-', 'g'));
  v_slug      := v_slug_base;

  -- Garantir unicidade do slug (loop de segurança; na prática raramente necessário)
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = v_slug) LOOP
    v_counter := v_counter + 1;
    v_slug    := v_slug_base || '-' || v_counter;
  END LOOP;

  -- Criar a organização
  INSERT INTO public.organizations (
    name, slug, client_code, org_type, is_active,
    "group", cost_center, responsible, responsible_email
  )
  VALUES (
    v_name, v_slug, p_client_code, 'client', true,
    v_group, v_cost_center, v_responsible, v_resp_email
  )
  RETURNING id INTO v_org_id;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_provision_org_for_client_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_provision_org_for_client_code(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_provision_org_for_client_code(text) TO authenticated;

-- ── 2. fn_provision_orgs_for_client_codes ────────────────────────
-- Versão batch: chamada pelo edge function sync-nav-excel com o array
-- completo de jvris_id processados no sync. Numa única chamada RPC.

CREATE OR REPLACE FUNCTION public.fn_provision_orgs_for_client_codes(p_client_codes text[])
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code       text;
  v_created    int := 0;
  v_org_id     uuid;
BEGIN
  FOREACH v_code IN ARRAY p_client_codes LOOP
    -- Ignorar codes nulos ou vazios
    IF v_code IS NULL OR trim(v_code) = '' THEN
      CONTINUE;
    END IF;

    -- Verificar se já existe (evitar chamar a função completa desnecessariamente)
    SELECT id INTO v_org_id
    FROM public.organizations
    WHERE client_code = v_code AND org_type = 'client'
    LIMIT 1;

    IF v_org_id IS NULL THEN
      PERFORM public.fn_provision_org_for_client_code(v_code);
      v_created := v_created + 1;
    END IF;
  END LOOP;

  RETURN v_created;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_provision_orgs_for_client_codes(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_provision_orgs_for_client_codes(text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_provision_orgs_for_client_codes(text[]) TO authenticated;

-- ── 3. Backfill único ─────────────────────────────────────────────
-- Cria organizations para todos os clientes do catálogo legacy que
-- não têm ainda uma org de tipo 'client'.
-- Executado uma vez nesta migration; nas sincronizações futuras é o
-- edge function que garante o provisioning incremental.

DO $$
DECLARE
  v_code   text;
  v_total  int := 0;
BEGIN
  FOR v_code IN
    SELECT ol.client_code
    FROM public.organizations_legacy ol
    WHERE ol.client_code IS NOT NULL
      AND trim(ol.client_code) <> ''
      AND ol.client_code <> 'C.0000'
      AND NOT EXISTS (
        SELECT 1
        FROM public.organizations o
        WHERE o.client_code = ol.client_code
          AND o.org_type = 'client'
      )
    ORDER BY ol.client_code
  LOOP
    PERFORM public.fn_provision_org_for_client_code(v_code);
    v_total := v_total + 1;
  END LOOP;

  RAISE NOTICE 'Backfill concluído: % organizações criadas', v_total;
END;
$$;

NOTIFY pgrst, 'reload schema';
