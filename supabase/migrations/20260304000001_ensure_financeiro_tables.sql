-- ============================================================
-- Idempotent migration: ensure financeiro tables exist
-- Resolves "Could not find the table 'public.financeiro_nav_items'
-- in the schema cache" error.
-- ============================================================

-- ── 1. Ensure jvris_id column on organizations ──────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS jvris_id text DEFAULT NULL;

-- ── 2. financeiro_nav_cache (parent / client summary) ───────
CREATE TABLE IF NOT EXISTS public.financeiro_nav_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jvris_id TEXT NOT NULL UNIQUE,
    valor_pendente NUMERIC DEFAULT 0,
    data_vencimento DATE,
    raw_row JSONB,
    synced_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financeiro_nav_cache_jvris_id
  ON public.financeiro_nav_cache(jvris_id);

ALTER TABLE public.financeiro_nav_cache ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read nav cache"
    ON public.financeiro_nav_cache FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can manage nav cache"
    ON public.financeiro_nav_cache FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 3. financeiro_nav_items (child / individual invoices) ───
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

CREATE INDEX IF NOT EXISTS idx_financeiro_nav_items_jvris
  ON public.financeiro_nav_items(jvris_id);

ALTER TABLE public.financeiro_nav_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read nav items"
    ON public.financeiro_nav_items FOR SELECT
    USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can manage nav items"
    ON public.financeiro_nav_items FOR ALL TO service_role
    USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. Force PostgREST to reload its schema cache ──────────
NOTIFY pgrst, 'reload schema';
