-- ============================================================
-- Assuntos / Processos (matter status)
--
-- Os trabalhos que a CCA tem em curso para o cliente. A CCA gere no cockpit;
-- o cliente vê no portal a fase atual e a linha temporal de atualizações.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.assuntos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'outro'
    CHECK (tipo IN ('contencioso', 'consultoria', 'transacao', 'due_diligence', 'registo', 'outro')),
  estado text NOT NULL DEFAULT 'aberto'
    CHECK (estado IN ('aberto', 'em_curso', 'aguarda_cliente', 'concluido', 'suspenso')),
  referencia text,
  responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  data_abertura date NOT NULL DEFAULT CURRENT_DATE,
  data_prevista_conclusao date,
  data_conclusao date,
  created_by_id uuid,
  updated_by_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assuntos_org_idx ON public.assuntos (organization_id, created_at DESC);
ALTER TABLE public.assuntos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.assunto_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assunto_id uuid NOT NULL REFERENCES public.assuntos(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'atualizacao'
    CHECK (tipo IN ('marco', 'atualizacao', 'documento', 'decisao', 'outro')),
  data date NOT NULL DEFAULT CURRENT_DATE,
  visivel_cliente boolean NOT NULL DEFAULT true,
  created_by_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assunto_eventos_assunto_idx ON public.assunto_eventos (assunto_id, data DESC);
ALTER TABLE public.assunto_eventos ENABLE ROW LEVEL SECURITY;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Cliente (membro da org) lê; CCA / platform admin gere.
DROP POLICY IF EXISTS assuntos_select ON public.assuntos;
CREATE POLICY assuntos_select ON public.assuntos FOR SELECT TO authenticated
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR is_cca_user(auth.uid())
  OR is_platform_admin(auth.uid())
);
DROP POLICY IF EXISTS assuntos_cca_write ON public.assuntos;
CREATE POLICY assuntos_cca_write ON public.assuntos FOR ALL TO authenticated
USING (is_cca_user(auth.uid()) OR is_platform_admin(auth.uid()))
WITH CHECK (is_cca_user(auth.uid()) OR is_platform_admin(auth.uid()));

-- Eventos: o cliente só vê os marcados como visíveis.
DROP POLICY IF EXISTS ae_select ON public.assunto_eventos;
CREATE POLICY ae_select ON public.assunto_eventos FOR SELECT TO authenticated
USING (
  (visivel_cliente AND organization_id = get_user_organization_id(auth.uid()))
  OR is_cca_user(auth.uid())
  OR is_platform_admin(auth.uid())
);
DROP POLICY IF EXISTS ae_cca_write ON public.assunto_eventos;
CREATE POLICY ae_cca_write ON public.assunto_eventos FOR ALL TO authenticated
USING (is_cca_user(auth.uid()) OR is_platform_admin(auth.uid()))
WITH CHECK (is_cca_user(auth.uid()) OR is_platform_admin(auth.uid()));

-- ── updated_at ───────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_assuntos_updated_at ON public.assuntos;
CREATE TRIGGER trg_assuntos_updated_at
  BEFORE UPDATE ON public.assuntos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Notificação ao cliente quando há uma atualização visível ─────────────────
CREATE OR REPLACE FUNCTION public.notify_assunto_evento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.visivel_cliente THEN
    INSERT INTO public.notifications (user_id, organization_id, type, title, message, reference_type, reference_id, read)
    SELECT m.user_id, NEW.organization_id, 'assunto_atualizacao',
           'Atualização num assunto', NEW.titulo, 'assunto', NEW.assunto_id, false
    FROM public.organization_members m
    JOIN public.profiles p ON p.id = m.user_id AND p.auth_method = 'local'
    WHERE m.organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assunto_evento_notify ON public.assunto_eventos;
CREATE TRIGGER trg_assunto_evento_notify
  AFTER INSERT ON public.assunto_eventos
  FOR EACH ROW EXECUTE FUNCTION public.notify_assunto_evento();

NOTIFY pgrst, 'reload schema';
