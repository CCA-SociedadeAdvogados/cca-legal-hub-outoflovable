-- Tabela para associar contratos a documentos legais
CREATE TABLE public.contrato_normativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  documento_id uuid NOT NULL,
  relevancia_score numeric(3,2) DEFAULT 0.5,
  motivo_associacao text,
  tipo_associacao text DEFAULT 'automatico', -- 'automatico' ou 'manual'
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_id uuid REFERENCES public.profiles(id),
  UNIQUE(contrato_id, documento_id)
);

-- Índices
CREATE INDEX idx_contrato_normativos_contrato ON public.contrato_normativos(contrato_id);
CREATE INDEX idx_contrato_normativos_documento ON public.contrato_normativos(documento_id);

-- RLS
ALTER TABLE public.contrato_normativos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contract legislation in their organization"
ON public.contrato_normativos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contratos c
    WHERE c.id = contrato_normativos.contrato_id
    AND c.organization_id = get_user_organization_id(auth.uid())
  )
);

CREATE POLICY "Editors can insert contract legislation"
ON public.contrato_normativos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM contratos c
    WHERE c.id = contrato_normativos.contrato_id
    AND c.organization_id = get_user_organization_id(auth.uid())
  )
);

CREATE POLICY "Editors can delete contract legislation"
ON public.contrato_normativos FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM contratos c
    WHERE c.id = contrato_normativos.contrato_id
    AND c.organization_id = get_user_organization_id(auth.uid())
  )
);