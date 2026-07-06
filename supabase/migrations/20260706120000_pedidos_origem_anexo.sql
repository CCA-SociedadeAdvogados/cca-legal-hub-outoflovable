-- ============================================================
-- Pedidos à CCA — origem e anexo como colunas de schema
--
-- As submissões de políticas do Portal usavam convenções frágeis: prefixo
-- "[Política]" no título e a linha "Ficheiro anexo: <path>" na descrição.
-- Passam a colunas próprias (origem, anexo_path), com migração dos registos
-- existentes e limpeza da linha de anexo nas descrições.
-- ============================================================

ALTER TABLE public.on_demand_requests
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'geral'
    CHECK (origem IN ('geral', 'politica')),
  ADD COLUMN IF NOT EXISTS anexo_path text;

-- Migrar registos criados com a convenção anterior.
UPDATE public.on_demand_requests
SET origem = 'politica'
WHERE titulo LIKE '[Política]%' AND origem = 'geral';

UPDATE public.on_demand_requests
SET anexo_path = substring(descricao from 'Ficheiro anexo: (\S+)')
WHERE anexo_path IS NULL AND descricao ~ 'Ficheiro anexo: \S+';

UPDATE public.on_demand_requests
SET descricao = nullif(trim(regexp_replace(descricao, '(\n\n)?Ficheiro anexo: \S+', '', 'g')), '')
WHERE descricao ~ 'Ficheiro anexo: \S+';

NOTIFY pgrst, 'reload schema';
