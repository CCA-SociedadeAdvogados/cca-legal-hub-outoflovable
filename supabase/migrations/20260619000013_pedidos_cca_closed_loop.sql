-- ============================================================
-- Pedidos à CCA (ciclo fechado)
--
-- Reaproveita a tabela on_demand_requests (existia só em produção — agora
-- também criada pela cadeia de migrações, eliminando o drift). O cliente abre
-- um pedido no Portal; a CCA acompanha e responde no cockpit; o estado segue um
-- ciclo fechado (pendente → em_analise → concluido | cancelado) e ambas as
-- partes são notificadas nas transições relevantes.
-- ============================================================

-- 0. Garantir o helper set_updated_at (existe em produção mas não era criado
--    pela cadeia de migrações → numa build de raiz o trigger abaixo falhava).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1. Tabela (idempotente — no-op em produção, criada numa build de raiz).
CREATE TABLE IF NOT EXISTS public.on_demand_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text,
  tipo_analise text NOT NULL DEFAULT 'conformidade'
    CHECK (tipo_analise IN ('conformidade', 'revisao_clausulas', 'due_diligence', 'outro')),
  estado text NOT NULL DEFAULT 'pendente'
    CHECK (estado IN ('pendente', 'em_analise', 'concluido', 'cancelado')),
  prioridade text NOT NULL DEFAULT 'normal'
    CHECK (prioridade IN ('urgente', 'normal', 'baixa')),
  solicitado_por_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  prazo_resposta date,
  resposta text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS on_demand_requests_org_idx
  ON public.on_demand_requests (organization_id, created_at DESC);

ALTER TABLE public.on_demand_requests ENABLE ROW LEVEL SECURITY;

-- 2. Políticas RLS — cliente (membro da org) + utilizadores CCA + platform admin.
--    As políticas antigas só consideravam get_user_organization_id, deixando os
--    utilizadores CCA (cuja org é a identidade CCA) sem acesso aos pedidos dos
--    clientes. Recriadas para fechar o ciclo nos dois lados.
DROP POLICY IF EXISTS odr_select ON public.on_demand_requests;
DROP POLICY IF EXISTS odr_insert ON public.on_demand_requests;
DROP POLICY IF EXISTS odr_update ON public.on_demand_requests;
DROP POLICY IF EXISTS odr_delete ON public.on_demand_requests;

CREATE POLICY odr_select ON public.on_demand_requests FOR SELECT TO authenticated
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR is_cca_user(auth.uid())
  OR is_platform_admin(auth.uid())
);

CREATE POLICY odr_insert ON public.on_demand_requests FOR INSERT TO authenticated
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
  OR is_cca_user(auth.uid())
  OR is_platform_admin(auth.uid())
);

CREATE POLICY odr_update ON public.on_demand_requests FOR UPDATE TO authenticated
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR is_cca_user(auth.uid())
  OR is_platform_admin(auth.uid())
)
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
  OR is_cca_user(auth.uid())
  OR is_platform_admin(auth.uid())
);

CREATE POLICY odr_delete ON public.on_demand_requests FOR DELETE TO authenticated
USING (
  (organization_id = get_user_organization_id(auth.uid())
    AND get_user_org_role(auth.uid(), organization_id) = ANY (ARRAY['owner'::app_role, 'admin'::app_role]))
  OR is_cca_user(auth.uid())
  OR is_platform_admin(auth.uid())
);

-- 3. updated_at automático.
DROP TRIGGER IF EXISTS trg_odr_updated_at ON public.on_demand_requests;
CREATE TRIGGER trg_odr_updated_at
  BEFORE UPDATE ON public.on_demand_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Notificações do ciclo fechado.
--    INSERT → notifica o advogado responsável da org (organizations.lawyer_user_id).
--    UPDATE → ao concluir ou ao registar/alterar resposta, notifica o solicitante.
CREATE OR REPLACE FUNCTION public.notify_on_demand_request_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_type, reference_id, read)
    SELECT o.lawyer_user_id, NEW.organization_id, 'pedido_novo',
           'Novo pedido de cliente', NEW.titulo, 'on_demand_request', NEW.id, false
    FROM public.organizations o
    WHERE o.id = NEW.organization_id AND o.lawyer_user_id IS NOT NULL;

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

DROP TRIGGER IF EXISTS trg_odr_notify ON public.on_demand_requests;
CREATE TRIGGER trg_odr_notify
  AFTER INSERT OR UPDATE ON public.on_demand_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_demand_request_change();

NOTIFY pgrst, 'reload schema';
