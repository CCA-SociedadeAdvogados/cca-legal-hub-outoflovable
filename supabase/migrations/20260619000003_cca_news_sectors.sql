-- Setorização das novidades.
-- Uma novidade pode visar um ou mais setores (industry_sectors). Sem setor = geral
-- (visível a todos os clientes). O portal cruza estes setores com os
-- industry_sectors da organização do cliente.

ALTER TABLE public.cca_news
  ADD COLUMN IF NOT EXISTS sectors text[] NOT NULL DEFAULT '{}';

-- Índice GIN para cruzamento eficiente por setor (sectors && org.industry_sectors)
CREATE INDEX IF NOT EXISTS cca_news_sectors_gin
  ON public.cca_news USING gin (sectors);
