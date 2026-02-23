
-- ============================================================
-- CCA Validate Contract — Migração incremental
-- ============================================================

-- 1) contract_ai_extractions
CREATE TABLE IF NOT EXISTS contract_ai_extractions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id  TEXT NOT NULL,
    kind         TEXT NOT NULL CHECK (kind IN ('draft', 'canonical')),
    payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
    status       TEXT NOT NULL DEFAULT 'provisional'
                 CHECK (status IN ('provisional', 'validated', 'needs_review', 'failed')),
    model_info   JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_extractions_contract_id ON contract_ai_extractions(contract_id);
CREATE INDEX IF NOT EXISTS idx_ai_extractions_kind ON contract_ai_extractions(kind);

-- 2) contract_ai_jobs
CREATE TABLE IF NOT EXISTS contract_ai_jobs (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id             TEXT NOT NULL,
    status                  TEXT NOT NULL DEFAULT 'queued'
                            CHECK (status IN ('queued','running','validated','needs_review','failed')),
    error                   TEXT,
    started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at             TIMESTAMPTZ,
    draft_extraction_id     UUID REFERENCES contract_ai_extractions(id) ON DELETE SET NULL,
    canonical_extraction_id UUID REFERENCES contract_ai_extractions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_contract_id ON contract_ai_jobs(contract_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON contract_ai_jobs(status);

-- 3) contract_ai_diffs
CREATE TABLE IF NOT EXISTS contract_ai_diffs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id      TEXT NOT NULL,
    job_id           UUID REFERENCES contract_ai_jobs(id) ON DELETE CASCADE,
    field_path       TEXT NOT NULL,
    draft_value      JSONB,
    canonical_value  JSONB,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_diffs_contract_id ON contract_ai_diffs(contract_id);
CREATE INDEX IF NOT EXISTS idx_ai_diffs_job_id ON contract_ai_diffs(job_id);

-- 4) contract_audit_log
CREATE TABLE IF NOT EXISTS contract_audit_log (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id  TEXT NOT NULL,
    action       TEXT NOT NULL,
    details      JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_contract_id ON contract_audit_log(contract_id);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE contract_ai_extractions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_ai_jobs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_ai_diffs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_audit_log       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_read_extractions" ON contract_ai_extractions;
CREATE POLICY "clients_read_extractions"
    ON contract_ai_extractions FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "clients_read_jobs" ON contract_ai_jobs;
CREATE POLICY "clients_read_jobs"
    ON contract_ai_jobs FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "internal_read_diffs" ON contract_ai_diffs;
CREATE POLICY "internal_read_diffs"
    ON contract_ai_diffs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users u
            WHERE u.id = auth.uid()
              AND (u.raw_user_meta_data->>'role') = 'internal'
        )
    );

DROP POLICY IF EXISTS "internal_read_audit" ON contract_audit_log;
CREATE POLICY "internal_read_audit"
    ON contract_audit_log FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM auth.users u
            WHERE u.id = auth.uid()
              AND (u.raw_user_meta_data->>'role') = 'internal'
        )
    );

-- ============================================================
-- Storage: garantir bucket "contracts" existe (idempotente)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;
