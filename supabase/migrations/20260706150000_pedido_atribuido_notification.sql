-- ============================================================
-- Pedidos à CCA — notificar o advogado atribuído
--
-- Com a atribuição manual de responsável (popup do cockpit e página de
-- pedidos), o advogado escolhido passa a ser notificado quando outra pessoa
-- lhe atribui um pedido. A auto-atribuição não gera notificação.
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_on_demand_request_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_org_name text;
  v_title text;
  v_message text;
  v_notified integer := 0;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT o.name INTO v_org_name FROM public.organizations o WHERE o.id = NEW.organization_id;

    v_title := CASE
      WHEN NEW.prioridade = 'urgente' THEN 'Novo pedido URGENTE de cliente'
      ELSE 'Novo pedido de cliente'
    END;
    v_message := coalesce(v_org_name, 'Cliente') || ' — ' || NEW.titulo;

    -- Advogado responsável pela organização, quando atribuído
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_type, reference_id, read)
    SELECT o.lawyer_user_id, NEW.organization_id, 'pedido_novo',
           v_title, v_message, 'on_demand_request', NEW.id, false
    FROM public.organizations o
    WHERE o.id = NEW.organization_id AND o.lawyer_user_id IS NOT NULL;
    GET DIAGNOSTICS v_notified = ROW_COUNT;

    -- Fallback: sem advogado atribuído, notificar toda a equipa CCA
    IF v_notified = 0 THEN
      INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_type, reference_id, read)
      SELECT om.user_id, NEW.organization_id, 'pedido_novo',
             v_title, v_message, 'on_demand_request', NEW.id, false
      FROM public.organization_members om
      JOIN public.organizations o ON o.id = om.organization_id AND o.org_type = 'cca_owner';
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Atribuição de responsável por outra pessoa → notificar o advogado escolhido
    IF NEW.responsavel_id IS NOT NULL
       AND NEW.responsavel_id IS DISTINCT FROM OLD.responsavel_id
       AND NEW.responsavel_id IS DISTINCT FROM auth.uid() THEN
      SELECT o.name INTO v_org_name FROM public.organizations o WHERE o.id = NEW.organization_id;
      INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_type, reference_id, read)
      VALUES (NEW.responsavel_id, NEW.organization_id, 'pedido_atribuido',
              'Foi-lhe atribuído um pedido de cliente',
              coalesce(v_org_name, 'Cliente') || ' — ' || NEW.titulo,
              'on_demand_request', NEW.id, false);
    END IF;

    IF (NEW.estado = 'concluido' AND OLD.estado IS DISTINCT FROM 'concluido')
       OR (NEW.resposta IS NOT NULL AND NEW.resposta IS DISTINCT FROM OLD.resposta) THEN
      INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_type, reference_id, read)
      SELECT NEW.solicitado_por_id, NEW.organization_id, 'pedido_respondido',
             'A CCA respondeu ao seu pedido', NEW.titulo, 'on_demand_request', NEW.id, false
      WHERE NEW.solicitado_por_id IS NOT NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
