-- ============================================================
-- Migration: organizations_legacy table + colunas em falta em organizations
--
-- Contexto: estas estruturas foram criadas directamente na BD
-- durante o desenvolvimento do modelo multi-tenant e do módulo
-- financeiro. Esta migration versiona-as no repositório.
-- Todas as operações são idempotentes (IF NOT EXISTS / IF NOT EXISTS).
-- ============================================================

-- ── 1. Tabela organizations_legacy (catálogo funcional/comercial) ──

CREATE TABLE IF NOT EXISTS public.organizations_legacy (
    id          integer      NOT NULL,
    client_code text         NOT NULL,
    name        text         NOT NULL,
    "group"     text,
    cost_center text,
    responsible text,
    responsible_email text,
    is_active   boolean      NOT NULL DEFAULT true,
    created_at  timestamptz  NOT NULL DEFAULT now(),
    updated_at  timestamptz  NOT NULL DEFAULT now()
);

-- Primary key (idempotente)
DO $$ BEGIN
    ALTER TABLE public.organizations_legacy ADD PRIMARY KEY (id);
EXCEPTION WHEN duplicate_table THEN NULL;
          WHEN duplicate_object THEN NULL;
END $$;

-- Índice único por client_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_legacy_client_code
    ON public.organizations_legacy(client_code);

-- RLS
ALTER TABLE public.organizations_legacy ENABLE ROW LEVEL SECURITY;

-- Política de leitura para utilizadores autenticados
DO $$ BEGIN
    CREATE POLICY "Authenticated users can read organizations_legacy"
        ON public.organizations_legacy FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Service role full access
DO $$ BEGIN
    CREATE POLICY "Service role can manage organizations_legacy"
        ON public.organizations_legacy FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT ON public.organizations_legacy TO authenticated;

-- ── 2. Colunas em falta na tabela organizations ───────────────────

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS legacy_org_id integer;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS client_code text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS "group" text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS cost_center text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS responsible text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS responsible_email text;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS org_type text DEFAULT 'client';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Índice por client_code em organizations
CREATE INDEX IF NOT EXISTS idx_organizations_client_code
    ON public.organizations(client_code);

-- ── 3. Reload PostgREST schema cache ──────────────────────────────
NOTIFY pgrst, 'reload schema';
