-- ============================================================
-- Reconciliação de schema — elimina a dívida estrutural em organizations.
--
-- Produção foi alterada manualmente ao longo do tempo (colunas slug e logo_url
-- removidas; default do id perdido), mas o conjunto de migrações continuava a
-- criá-las. Uma build de raiz (Supabase Preview / db push) ficava divergente da
-- produção, e a coluna slug (NOT NULL) chegava a quebrar inserts.
--
-- Esta migração alinha AMBOS os ambientes para o mesmo estado, de forma
-- idempotente (no-op onde já está alinhado).
-- ============================================================

-- 1. Remover colunas que a produção já não tem e a aplicação não usa.
--    CASCADE remove também a constraint única organizations_slug_key.
ALTER TABLE public.organizations DROP COLUMN IF EXISTS slug CASCADE;
ALTER TABLE public.organizations DROP COLUMN IF EXISTS logo_url;

-- 2. Repor o default são do id (perdido em produção).
ALTER TABLE public.organizations ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Recriar fn_provision_org_for_client_code sem a coluna slug (estava partida —
--    referenciava slug inexistente em produção). Provisiona uma org-cliente a
--    partir do código JVRIS (C.XXXX), herdando metadados do catálogo legacy.
CREATE OR REPLACE FUNCTION public.fn_provision_org_for_client_code(p_client_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_org_id      uuid;
  v_name        text;
  v_group       text;
  v_cost_center text;
  v_responsible text;
  v_resp_email  text;
BEGIN
  -- Devolver org existente se já provisionada
  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE client_code = p_client_code AND org_type = 'client'
  LIMIT 1;
  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  -- Metadados do catálogo legacy (JVRIS)
  SELECT COALESCE(name, p_client_code), "group", cost_center, responsible, responsible_email
  INTO v_name, v_group, v_cost_center, v_responsible, v_resp_email
  FROM public.organizations_legacy
  WHERE client_code = p_client_code
  LIMIT 1;
  v_name := COALESCE(v_name, p_client_code);

  INSERT INTO public.organizations (
    name, client_code, org_type, is_active, "group", cost_center, responsible, responsible_email
  )
  VALUES (
    v_name, p_client_code, 'client', true, v_group, v_cost_center, v_responsible, v_resp_email
  )
  RETURNING id INTO v_org_id;

  RETURN v_org_id;
END;
$function$;

NOTIFY pgrst, 'reload schema';
