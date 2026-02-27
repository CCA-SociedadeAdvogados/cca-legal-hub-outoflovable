-- =====================================================
-- bc_customers — tabela simples para sync do BC
-- Corre no SQL Editor do Supabase Dashboard
-- =====================================================
--
-- ATENÇÃO: se já correste a migration
--   20260227000001_business_central_integration.sql
-- essa criou um bc_customers com schema diferente (com config_id).
-- Nesse caso faz primeiro:
--   DROP TABLE public.bc_customers CASCADE;
-- antes de correr este SQL.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bc_customers (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id     UUID        NOT NULL,
    bc_id               TEXT        NOT NULL,
    bc_number           TEXT,
    display_name        TEXT        NOT NULL,
    nif                 TEXT,
    address             TEXT,
    city                TEXT,
    country             TEXT,
    post_code           TEXT,
    phone               TEXT,
    email               TEXT,
    balance             NUMERIC(18, 2),
    credit_limit        NUMERIC(18, 2),
    payment_terms_code  TEXT,
    currency_code       TEXT        DEFAULT 'EUR',
    bc_last_modified    TIMESTAMPTZ,
    synced_at           TIMESTAMPTZ DEFAULT now(),

    UNIQUE (organization_id, bc_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bc_customers_org  ON public.bc_customers (organization_id);
CREATE INDEX IF NOT EXISTS idx_bc_customers_name ON public.bc_customers (display_name);

-- RLS
ALTER TABLE public.bc_customers ENABLE ROW LEVEL SECURITY;

-- Utilizadores autenticados da organização podem ler os seus dados
CREATE POLICY "org members can read bc_customers"
    ON public.bc_customers FOR SELECT
    USING (
        organization_id IN (
            SELECT current_organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- O sync agent usa service_role key — tem acesso total
CREATE POLICY "service_role full access bc_customers"
    ON public.bc_customers FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
