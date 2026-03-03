-- Adicionar jvris_id à tabela organizations
ALTER TABLE public.organizations ADD COLUMN jvris_id text DEFAULT NULL;

-- Tabela de cache dos dados do Excel "Base Nav"
CREATE TABLE IF NOT EXISTS public.financeiro_nav_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jvris_id TEXT NOT NULL UNIQUE,
    valor_pendente NUMERIC DEFAULT 0,
    data_vencimento DATE,
    raw_row JSONB,
    synced_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_financeiro_nav_cache_jvris_id ON public.financeiro_nav_cache(jvris_id);

ALTER TABLE public.financeiro_nav_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read nav cache"
    ON public.financeiro_nav_cache FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage nav cache"
    ON public.financeiro_nav_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
