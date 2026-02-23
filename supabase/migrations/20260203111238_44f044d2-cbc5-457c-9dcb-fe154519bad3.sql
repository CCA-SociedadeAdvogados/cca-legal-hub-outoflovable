-- Create table to store contract triage analysis results
CREATE TABLE public.contract_triage_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  
  -- Analysis metadata
  analysis_id TEXT NOT NULL,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  analyzed_by_id UUID REFERENCES auth.users(id),
  
  -- Source information
  text_source TEXT NOT NULL DEFAULT 'database_fields', -- 'pdf', 'word', 'database_fields'
  text_length INTEGER NOT NULL DEFAULT 0,
  file_name TEXT,
  
  -- Results
  score_global NUMERIC(5,2) NOT NULL DEFAULT 0,
  nivel_risco_global TEXT NOT NULL DEFAULT 'baixo',
  tipo_contrato TEXT,
  resumo_executivo TEXT,
  
  -- Detailed analysis (JSONB for flexibility)
  analises_clausulas JSONB DEFAULT '[]'::jsonb,
  red_flags_prioritarios JSONB DEFAULT '[]'::jsonb,
  recomendacoes_globais TEXT[] DEFAULT '{}',
  proximos_passos TEXT[] DEFAULT '{}',
  
  -- Clause counts
  total_clausulas_analisadas INTEGER DEFAULT 0,
  clausulas_conformes INTEGER DEFAULT 0,
  clausulas_alto_risco INTEGER DEFAULT 0,
  clausulas_criticas INTEGER DEFAULT 0,
  
  -- Raw API response for debugging
  raw_response JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Only keep latest analysis per contract
  CONSTRAINT unique_latest_triage UNIQUE (contrato_id)
);

-- Enable RLS
ALTER TABLE public.contract_triage_analyses ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only see analyses for contracts in their organization
CREATE POLICY "Users can view triage analyses for their organization contracts"
  ON public.contract_triage_analyses
  FOR SELECT
  USING (
    organization_id IN (
      SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert triage analyses for their organization contracts"
  ON public.contract_triage_analyses
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update triage analyses for their organization contracts"
  ON public.contract_triage_analyses
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete triage analyses for their organization contracts"
  ON public.contract_triage_analyses
  FOR DELETE
  USING (
    organization_id IN (
      SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_contract_triage_analyses_contrato ON public.contract_triage_analyses(contrato_id);
CREATE INDEX idx_contract_triage_analyses_org ON public.contract_triage_analyses(organization_id);

-- Add trigger for updated_at
CREATE TRIGGER update_contract_triage_analyses_updated_at
  BEFORE UPDATE ON public.contract_triage_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();