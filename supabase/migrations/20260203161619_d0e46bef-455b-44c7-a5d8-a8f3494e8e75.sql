-- Add AI model tracking to contract triage analyses
ALTER TABLE public.contract_triage_analyses 
ADD COLUMN IF NOT EXISTS ai_model_used text DEFAULT 'openai/gpt-5';

-- Add comment for documentation
COMMENT ON COLUMN public.contract_triage_analyses.ai_model_used IS 'Modelo de IA utilizado para gerar a análise de triagem';