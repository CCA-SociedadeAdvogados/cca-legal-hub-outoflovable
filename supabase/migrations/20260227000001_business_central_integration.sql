-- =====================================================
-- Business Central Integration Tables
-- Sincronização com Microsoft Dynamics 365 BC on-premises
-- via agente local de sincronização
-- =====================================================

-- Tabela de configuração do Business Central por organização
CREATE TABLE IF NOT EXISTS public.bc_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    bc_url TEXT NOT NULL, -- URL base do BC, ex: http://10.110.250.30:2053/BC140WS
    company_guid TEXT NOT NULL, -- GUID da empresa BC
    company_name TEXT,
    is_enabled BOOLEAN DEFAULT true,
    sync_interval_minutes INTEGER DEFAULT 60,
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT CHECK (last_sync_status IN ('success', 'error', 'running')),
    last_sync_error TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id)
);

-- Tabela de clientes sincronizados do Business Central
CREATE TABLE IF NOT EXISTS public.bc_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    config_id UUID NOT NULL REFERENCES public.bc_config(id) ON DELETE CASCADE,

    -- Identificadores BC
    bc_id TEXT NOT NULL, -- ID único do cliente no BC (GUID)
    bc_number TEXT, -- Número do cliente no BC (ex: C00010)

    -- Dados do cliente
    display_name TEXT NOT NULL,
    nif TEXT, -- Número de Identificação Fiscal (taxRegistrationNumber)
    address TEXT,
    city TEXT,
    country TEXT,
    post_code TEXT,
    phone TEXT,
    email TEXT,

    -- Dados financeiros
    balance NUMERIC(18, 2) DEFAULT 0,
    credit_limit NUMERIC(18, 2),
    payment_terms_code TEXT,
    currency_code TEXT DEFAULT 'EUR',
    customer_posting_group TEXT,

    -- Controlo
    bc_last_modified TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(config_id, bc_id)
);

-- Tabela de contas (Conta / Account) sincronizadas do Business Central
CREATE TABLE IF NOT EXISTS public.bc_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    config_id UUID NOT NULL REFERENCES public.bc_config(id) ON DELETE CASCADE,

    -- Identificadores BC
    bc_id TEXT NOT NULL, -- ID único da conta no BC
    account_number TEXT, -- Número da conta (ex: 2110)

    -- Dados da conta
    display_name TEXT NOT NULL,
    account_category TEXT,
    account_sub_category TEXT,
    balance NUMERIC(18, 2) DEFAULT 0,
    account_type TEXT,
    blocked BOOLEAN DEFAULT false,

    -- Controlo
    synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(config_id, bc_id)
);

-- Tabela de lançamentos da conta corrente (arq_ledger) do Business Central
CREATE TABLE IF NOT EXISTS public.bc_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    config_id UUID NOT NULL REFERENCES public.bc_config(id) ON DELETE CASCADE,

    -- Identificadores BC
    bc_entry_number INTEGER, -- Número de entrada no BC (Entry No.)
    customer_bc_id UUID REFERENCES public.bc_customers(id) ON DELETE SET NULL,
    customer_number TEXT, -- Número do cliente (para consulta sem FK)

    -- Dados do lançamento
    posting_date DATE,
    document_type TEXT, -- Invoice, Payment, Credit Memo, etc.
    document_number TEXT,
    description TEXT,
    amount NUMERIC(18, 2),
    remaining_amount NUMERIC(18, 2),
    due_date DATE,
    currency_code TEXT DEFAULT 'EUR',
    is_open BOOLEAN DEFAULT true, -- true = por liquidar, false = liquidado
    posting_group TEXT,

    -- Controlo
    synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(config_id, bc_entry_number)
);

-- Tabela de log de sincronizações
CREATE TABLE IF NOT EXISTS public.bc_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES public.bc_config(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    status TEXT CHECK (status IN ('running', 'success', 'error')) DEFAULT 'running',

    -- Estatísticas
    customers_synced INTEGER DEFAULT 0,
    accounts_synced INTEGER DEFAULT 0,
    ledger_entries_synced INTEGER DEFAULT 0,

    -- Erros
    error_message TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_bc_customers_org ON public.bc_customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_bc_customers_config ON public.bc_customers(config_id);
CREATE INDEX IF NOT EXISTS idx_bc_customers_name ON public.bc_customers(display_name);
CREATE INDEX IF NOT EXISTS idx_bc_customers_bc_number ON public.bc_customers(bc_number);
CREATE INDEX IF NOT EXISTS idx_bc_customers_not_deleted ON public.bc_customers(is_deleted) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_bc_accounts_org ON public.bc_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_bc_accounts_config ON public.bc_accounts(config_id);
CREATE INDEX IF NOT EXISTS idx_bc_accounts_number ON public.bc_accounts(account_number);

CREATE INDEX IF NOT EXISTS idx_bc_ledger_org ON public.bc_ledger(organization_id);
CREATE INDEX IF NOT EXISTS idx_bc_ledger_config ON public.bc_ledger(config_id);
CREATE INDEX IF NOT EXISTS idx_bc_ledger_customer ON public.bc_ledger(customer_bc_id);
CREATE INDEX IF NOT EXISTS idx_bc_ledger_customer_number ON public.bc_ledger(customer_number);
CREATE INDEX IF NOT EXISTS idx_bc_ledger_posting_date ON public.bc_ledger(posting_date DESC);
CREATE INDEX IF NOT EXISTS idx_bc_ledger_is_open ON public.bc_ledger(is_open);
CREATE INDEX IF NOT EXISTS idx_bc_ledger_due_date ON public.bc_ledger(due_date);

CREATE INDEX IF NOT EXISTS idx_bc_sync_logs_config ON public.bc_sync_logs(config_id);
CREATE INDEX IF NOT EXISTS idx_bc_sync_logs_started ON public.bc_sync_logs(started_at DESC);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_bc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bc_config_updated_at
    BEFORE UPDATE ON public.bc_config
    FOR EACH ROW
    EXECUTE FUNCTION update_bc_updated_at();

CREATE TRIGGER trigger_bc_customers_updated_at
    BEFORE UPDATE ON public.bc_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_bc_updated_at();

CREATE TRIGGER trigger_bc_accounts_updated_at
    BEFORE UPDATE ON public.bc_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_bc_updated_at();

CREATE TRIGGER trigger_bc_ledger_updated_at
    BEFORE UPDATE ON public.bc_ledger
    FOR EACH ROW
    EXECUTE FUNCTION update_bc_updated_at();

-- RLS Policies
ALTER TABLE public.bc_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bc_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bc_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bc_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bc_sync_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para bc_config
CREATE POLICY "Users can view their org bc config"
    ON public.bc_config FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage bc config"
    ON public.bc_config FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
        )
    );

CREATE POLICY "System can manage bc config"
    ON public.bc_config FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Políticas para bc_customers
CREATE POLICY "Users can view their org bc customers"
    ON public.bc_customers FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "System can manage bc customers"
    ON public.bc_customers FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Políticas para bc_accounts
CREATE POLICY "Users can view their org bc accounts"
    ON public.bc_accounts FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "System can manage bc accounts"
    ON public.bc_accounts FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Políticas para bc_ledger
CREATE POLICY "Users can view their org bc ledger"
    ON public.bc_ledger FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "System can manage bc ledger"
    ON public.bc_ledger FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Políticas para bc_sync_logs
CREATE POLICY "Users can view their org bc sync logs"
    ON public.bc_sync_logs FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "System can manage bc sync logs"
    ON public.bc_sync_logs FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Comentários
COMMENT ON TABLE public.bc_config IS 'Configuração da integração Business Central por organização';
COMMENT ON TABLE public.bc_customers IS 'Cache de clientes sincronizados do Business Central';
COMMENT ON TABLE public.bc_accounts IS 'Cache de contas (Conta/Account) sincronizadas do Business Central';
COMMENT ON TABLE public.bc_ledger IS 'Cache de lançamentos da conta corrente (arq_ledger) do Business Central';
COMMENT ON TABLE public.bc_sync_logs IS 'Histórico de sincronizações com Business Central';
COMMENT ON COLUMN public.bc_config.bc_url IS 'URL base do servidor BC, ex: http://10.110.250.30:2053/BC140WS';
COMMENT ON COLUMN public.bc_config.company_guid IS 'GUID da empresa BC, ex: a19b2029-4c6b-411e-9265-224d70785270';
COMMENT ON COLUMN public.bc_ledger.is_open IS 'true = por liquidar (em aberto), false = liquidado';
