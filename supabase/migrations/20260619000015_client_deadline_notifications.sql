-- Notificações proativas para o CLIENTE sobre prazos de contratos.
--
-- A função existente create_contract_expiry_notifications só notifica o
-- responsável interno da CCA e só o termo. Esta gera notificações para os
-- utilizadores do PORTAL (membros locais da organização-cliente) sobre o termo
-- e a decisão de renovação que se aproximam (janelas 30/60/90 dias), sem
-- duplicar (um aviso por utilizador × contrato × marco/janela).

CREATE OR REPLACE FUNCTION public.fn_create_client_deadline_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_inserted integer := 0;
  v_n integer;
BEGIN
  -- ── Termo do contrato ───────────────────────────────────────────────────
  WITH alvo AS (
    SELECT
      c.id, c.organization_id, c.titulo_contrato, c.data_termo AS d,
      'prazo_termo_' || (CASE
        WHEN c.data_termo <= CURRENT_DATE + 30 THEN '30'
        WHEN c.data_termo <= CURRENT_DATE + 60 THEN '60'
        ELSE '90' END) AS ntype
    FROM public.contratos c
    JOIN public.organizations o ON o.id = c.organization_id AND o.org_type = 'client'
    WHERE c.estado_contrato = 'activo'
      AND c.arquivado IS NOT TRUE
      AND c.data_termo IS NOT NULL
      AND c.data_termo BETWEEN CURRENT_DATE AND CURRENT_DATE + 90
  )
  INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_type, reference_id, read)
  SELECT m.user_id, a.organization_id, a.ntype,
         'Prazo de contrato a aproximar-se',
         a.titulo_contrato || ' — termo em ' || to_char(a.d, 'DD/MM/YYYY'),
         'contratos', a.id, false
  FROM alvo a
  JOIN public.organization_members m ON m.organization_id = a.organization_id
  JOIN public.profiles p ON p.id = m.user_id AND p.auth_method = 'local'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = m.user_id AND n.reference_id = a.id AND n.type = a.ntype
  );
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_inserted := v_inserted + v_n;

  -- ── Decisão de renovação ────────────────────────────────────────────────
  WITH alvo AS (
    SELECT
      c.id, c.organization_id, c.titulo_contrato, c.data_limite_decisao_renovacao AS d,
      'prazo_renovacao_' || (CASE
        WHEN c.data_limite_decisao_renovacao <= CURRENT_DATE + 30 THEN '30'
        WHEN c.data_limite_decisao_renovacao <= CURRENT_DATE + 60 THEN '60'
        ELSE '90' END) AS ntype
    FROM public.contratos c
    JOIN public.organizations o ON o.id = c.organization_id AND o.org_type = 'client'
    WHERE c.estado_contrato = 'activo'
      AND c.arquivado IS NOT TRUE
      AND c.data_limite_decisao_renovacao IS NOT NULL
      AND c.data_limite_decisao_renovacao BETWEEN CURRENT_DATE AND CURRENT_DATE + 90
  )
  INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_type, reference_id, read)
  SELECT m.user_id, a.organization_id, a.ntype,
         'Decisão de renovação a aproximar-se',
         a.titulo_contrato || ' — decidir renovação até ' || to_char(a.d, 'DD/MM/YYYY'),
         'contratos', a.id, false
  FROM alvo a
  JOIN public.organization_members m ON m.organization_id = a.organization_id
  JOIN public.profiles p ON p.id = m.user_id AND p.auth_method = 'local'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = m.user_id AND n.reference_id = a.id AND n.type = a.ntype
  );
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_inserted := v_inserted + v_n;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_create_client_deadline_notifications() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_client_deadline_notifications() TO service_role;
