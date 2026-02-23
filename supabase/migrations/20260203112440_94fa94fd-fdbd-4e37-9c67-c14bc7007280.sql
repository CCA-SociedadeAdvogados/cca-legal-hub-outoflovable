-- Drop existing policy and create simpler one matching other tables pattern
DROP POLICY IF EXISTS "Org members can view contract triage analyses" ON public.contract_triage_analyses;

-- Use direct organization_id check like contract_compliance_analyses table
CREATE POLICY "Org members can view contract triage analyses"
ON public.contract_triage_analyses
FOR SELECT
USING (
  is_platform_admin(auth.uid()) 
  OR organization_id = get_user_organization_id(auth.uid())
);