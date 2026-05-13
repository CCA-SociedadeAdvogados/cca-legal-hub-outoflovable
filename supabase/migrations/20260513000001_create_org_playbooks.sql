-- ============================================================
-- Migration: Criar tabela org_playbooks
--
-- Playbook legal por organização e por scope (commercial, privacy,
-- corporate, employment, etc.). Lido por todas as Edge Functions
-- de IA via supabase/functions/_shared/playbook.ts e injectado no
-- system prompt. Substitui o padrão cold-start-interview dos
-- plugins claude-for-legal — vive na BD do Hub, não no CLI local.
--
-- jurisdictions_allowed default ['PT','EU'] aplica a regra
-- crítica #15 (Direito PT/EU only) do CLAUDE.md.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.org_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plugin_scope text NOT NULL,
  playbook_md text NOT NULL DEFAULT '',
  escalation_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  jurisdictions_allowed text[] NOT NULL DEFAULT ARRAY['PT', 'EU'],
  created_by_id uuid NOT NULL REFERENCES auth.users(id),
  updated_by_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_playbooks_scope_check CHECK (
    plugin_scope IN (
      'global',
      'commercial',
      'privacy',
      'corporate',
      'employment',
      'regulatory',
      'ai_governance',
      'product'
    )
  ),
  CONSTRAINT org_playbooks_jurisdiction_check CHECK (
    array_length(jurisdictions_allowed, 1) >= 1
    AND NOT (jurisdictions_allowed && ARRAY['US', 'UK', 'JP', 'CN'])
  ),
  UNIQUE (organization_id, plugin_scope)
);

CREATE INDEX IF NOT EXISTS idx_org_playbooks_organization_id
  ON public.org_playbooks (organization_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.org_playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members or CCA users can read playbooks"
  ON public.org_playbooks FOR SELECT TO authenticated
  USING (
    public.fn_is_cca_internal_authorized(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = org_playbooks.organization_id
    )
  );

CREATE POLICY "CCA users can insert playbooks"
  ON public.org_playbooks FOR INSERT TO authenticated
  WITH CHECK (
    public.fn_is_cca_internal_authorized(auth.uid())
  );

CREATE POLICY "CCA users can update playbooks"
  ON public.org_playbooks FOR UPDATE TO authenticated
  USING (
    public.fn_is_cca_internal_authorized(auth.uid())
  )
  WITH CHECK (
    public.fn_is_cca_internal_authorized(auth.uid())
  );

CREATE POLICY "CCA users can delete playbooks"
  ON public.org_playbooks FOR DELETE TO authenticated
  USING (
    public.fn_is_cca_internal_authorized(auth.uid())
  );

COMMENT ON TABLE public.org_playbooks IS
  'Playbook legal por organização e scope. Lido pelas Edge Functions de IA via _shared/playbook.ts. Ver docs/plugin-roadmap.md e regra #15 do CLAUDE.md (PT/EU only).';
COMMENT ON COLUMN public.org_playbooks.plugin_scope IS
  'Âmbito: global | commercial | privacy | corporate | employment | regulatory | ai_governance | product';
COMMENT ON COLUMN public.org_playbooks.jurisdictions_allowed IS
  'Lista de jurisdições permitidas. Default [PT,EU]. Constraint bloqueia US/UK/JP/CN.';
COMMENT ON COLUMN public.org_playbooks.escalation_rules IS
  'Estrutura JSON com thresholds de risco, aprovadores, prazos. Lido por escalation-flagger.';

-- ── Reload PostgREST schema cache ──────────────────────────────
NOTIFY pgrst, 'reload schema';
