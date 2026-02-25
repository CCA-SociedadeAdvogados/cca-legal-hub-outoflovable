
-- Renomear source 'lovable_ai' para 'ai_extraction' na tabela contract_extractions

-- 1. Remover o constraint existente
ALTER TABLE public.contract_extractions
  DROP CONSTRAINT IF EXISTS contract_extractions_source_check;

-- 2. Actualizar dados existentes
UPDATE public.contract_extractions
  SET source = 'ai_extraction'
  WHERE source = 'lovable_ai';

-- 3. Adicionar novo constraint com o valor actualizado
ALTER TABLE public.contract_extractions
  ADD CONSTRAINT contract_extractions_source_check
  CHECK (source IN ('ai_extraction', 'cca_agent'));
