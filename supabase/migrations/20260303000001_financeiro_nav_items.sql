-- Tabela de linhas individuais (faturas) do Excel "Base Nav" por cliente
CREATE TABLE IF NOT EXISTS public.financeiro_nav_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jvris_id TEXT NOT NULL,
    numero_documento TEXT,
    descricao TEXT,
    valor NUMERIC DEFAULT 0,
    data_vencimento DATE,
    raw_row JSONB,
    synced_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_financeiro_nav_items_jvris ON public.financeiro_nav_items(jvris_id);

ALTER TABLE public.financeiro_nav_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read nav items"
    ON public.financeiro_nav_items FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can manage nav items"
    ON public.financeiro_nav_items FOR ALL TO service_role USING (true) WITH CHECK (true);
