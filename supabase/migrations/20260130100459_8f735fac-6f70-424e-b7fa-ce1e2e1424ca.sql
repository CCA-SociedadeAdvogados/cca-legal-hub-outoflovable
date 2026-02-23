-- Tabela para guardar resultados da análise de conformidade
CREATE TABLE public.contract_compliance_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  
  -- Resultado da análise
  resumo_contrato TEXT,
  sumario_geral JSONB NOT NULL DEFAULT '{}',
  eventos_verificados JSONB NOT NULL DEFAULT '[]',
  recomendacoes_gerais TEXT[] DEFAULT '{}',
  proximos_passos TEXT[] DEFAULT '{}',
  confianca INTEGER,
  
  -- Estado geral
  status_global TEXT CHECK (status_global IN ('conforme', 'parcialmente_conforme', 'nao_conforme')),
  
  -- Metadados
  texto_analisado_hash TEXT,
  ai_model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by_id UUID REFERENCES public.profiles(id),
  
  UNIQUE(contrato_id)
);

-- Índices
CREATE INDEX idx_compliance_analyses_contrato ON public.contract_compliance_analyses(contrato_id);
CREATE INDEX idx_compliance_analyses_org ON public.contract_compliance_analyses(organization_id);

-- RLS
ALTER TABLE public.contract_compliance_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view compliance analyses for their org"
  ON public.contract_compliance_analyses FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can insert compliance analyses for their org"
  ON public.contract_compliance_analyses FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update compliance analyses for their org"
  ON public.contract_compliance_analyses FOR UPDATE
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can delete compliance analyses"
  ON public.contract_compliance_analyses FOR DELETE
  USING (
    organization_id = get_user_organization_id(auth.uid()) 
    AND get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  );