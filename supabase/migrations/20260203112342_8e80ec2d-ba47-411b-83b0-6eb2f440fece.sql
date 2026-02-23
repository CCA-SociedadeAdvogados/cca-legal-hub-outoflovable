-- Ensure RLS is enabled
ALTER TABLE public.contract_triage_analyses ENABLE ROW LEVEL SECURITY;

-- Allow organization members to read triage analyses by checking the related contract's organization
DROP POLICY IF EXISTS "Org members can view contract triage analyses" ON public.contract_triage_analyses;
CREATE POLICY "Org members can view contract triage analyses"
ON public.contract_triage_analyses
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.contratos c
    WHERE c.id = contract_triage_analyses.contrato_id
      AND c.organization_id IS NOT NULL
      AND public.user_belongs_to_organization(auth.uid(), c.organization_id)
  )
);

-- Explicitly block client-side writes (writes should happen via backend function/service role)
DROP POLICY IF EXISTS "No direct insert contract triage analyses" ON public.contract_triage_analyses;
CREATE POLICY "No direct insert contract triage analyses"
ON public.contract_triage_analyses
FOR INSERT
WITH CHECK (false);

DROP POLICY IF EXISTS "No direct update contract triage analyses" ON public.contract_triage_analyses;
CREATE POLICY "No direct update contract triage analyses"
ON public.contract_triage_analyses
FOR UPDATE
USING (false);

DROP POLICY IF EXISTS "No direct delete contract triage analyses" ON public.contract_triage_analyses;
CREATE POLICY "No direct delete contract triage analyses"
ON public.contract_triage_analyses
FOR DELETE
USING (false);
