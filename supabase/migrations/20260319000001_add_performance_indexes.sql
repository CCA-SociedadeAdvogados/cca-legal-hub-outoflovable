-- Performance indexes for frequently queried columns
-- organization_members is used in ALL RLS policies (20+ evaluations per request)

-- Compound index on organization_members (critical for RLS performance)
CREATE INDEX IF NOT EXISTS idx_organization_members_org_user
  ON public.organization_members (organization_id, user_id);

-- Contratos listing (main query pattern: filter by org, sort by date)
CREATE INDEX IF NOT EXISTS idx_contratos_organization_id
  ON public.contratos (organization_id);

CREATE INDEX IF NOT EXISTS idx_contratos_org_created
  ON public.contratos (organization_id, created_at DESC);

-- Eventos legislativos (scoped by org)
CREATE INDEX IF NOT EXISTS idx_eventos_legislativos_organization_id
  ON public.eventos_legislativos (organization_id);

-- Contract lifecycle events (timeline queries)
CREATE INDEX IF NOT EXISTS idx_eventos_ciclo_vida_contrato_id
  ON public.eventos_ciclo_vida_contrato (contrato_id, created_at DESC);
