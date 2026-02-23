
-- Nova tabela: contract_extractions
CREATE TABLE IF NOT EXISTS public.contract_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('lovable_ai', 'cca_agent')),
  status TEXT NOT NULL DEFAULT 'provisional' CHECK (status IN ('provisional', 'validated', 'needs_review', 'failed')),
  extraction_data JSONB NOT NULL DEFAULT '{}',
  confidence NUMERIC(5,2),
  evidence JSONB DEFAULT '[]',
  review_notes TEXT,
  diff_from_draft JSONB,
  classificacao_juridica JSONB,
  prazos JSONB,
  denuncia_rescisao JSONB,
  lei_aplicavel TEXT,
  foro_arbitragem TEXT,
  rgpd_summary JSONB,
  job_id TEXT,
  job_started_at TIMESTAMPTZ,
  job_completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id UUID REFERENCES public.profiles(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ce_contrato ON public.contract_extractions(contrato_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ce_contrato_source ON public.contract_extractions(contrato_id, source);

-- RLS
ALTER TABLE public.contract_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ce_select" ON public.contract_extractions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ce_insert" ON public.contract_extractions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ce_update" ON public.contract_extractions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ce_delete" ON public.contract_extractions FOR DELETE TO authenticated USING (true);

-- Trigger updated_at
CREATE TRIGGER update_ce_updated_at
  BEFORE UPDATE ON public.contract_extractions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Coluna validation_status na tabela contratos
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'none'
  CHECK (validation_status IN ('none', 'draft_only', 'validating', 'validated', 'needs_review', 'failed'));
