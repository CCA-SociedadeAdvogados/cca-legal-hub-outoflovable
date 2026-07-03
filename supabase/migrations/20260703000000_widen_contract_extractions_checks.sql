-- As funções edge executive-summary, analyze-contract-client e redline-contract
-- guardam caches em contract_extractions com source = 'executive_summary' /
-- 'client_analysis' / 'redline' e status = 'success', e validate-contract pode
-- gravar status = 'draft_only' (fallback quando a validação IA falha).
-- Os CHECK constraints actuais rejeitam esses valores, o upsert falha
-- silenciosamente e cada abertura repete a chamada paga ao modelo.

-- 1. Alargar o constraint de source
ALTER TABLE public.contract_extractions
  DROP CONSTRAINT IF EXISTS contract_extractions_source_check;

ALTER TABLE public.contract_extractions
  ADD CONSTRAINT contract_extractions_source_check
  CHECK (source IN ('ai_extraction', 'cca_agent', 'executive_summary', 'client_analysis', 'redline'));

-- 2. Alargar o constraint de status
ALTER TABLE public.contract_extractions
  DROP CONSTRAINT IF EXISTS contract_extractions_status_check;

ALTER TABLE public.contract_extractions
  ADD CONSTRAINT contract_extractions_status_check
  CHECK (status IN ('provisional', 'validated', 'needs_review', 'failed', 'success', 'draft_only'));
