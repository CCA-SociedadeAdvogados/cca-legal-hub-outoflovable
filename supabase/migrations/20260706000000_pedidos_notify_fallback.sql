-- ============================================================
-- Pedidos à CCA — notificações resilientes
--
-- O trigger notify_on_demand_request_change (20260619000013) só notificava
-- organizations.lawyer_user_id no INSERT. Em produção nenhuma organização tem
-- lawyer_user_id preenchido, pelo que nenhum pedido gerava notificação — os
-- pedidos chegavam em silêncio. Passa a haver fallback: sem advogado atribuído,
-- são notificados todos os utilizadores CCA (membros da organização cca_owner).
-- A prioridade urgente é destacada no título e o nome do cliente na mensagem.
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

-- O trigger trg_odr_notify (AFTER INSERT OR UPDATE) já existe e aponta para
-- esta função — o CREATE OR REPLACE acima é suficiente.
