
-- Restrict contract_compliance_analyses SELECT access to editors and above
-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view compliance analyses for their org" ON public.contract_compliance_analyses;

-- Create new restrictive policy: Only editors, admins, owners, and platform admins can view
CREATE POLICY "Editors and above can view compliance analyses"
ON public.contract_compliance_analyses
FOR SELECT
TO authenticated
USING (
  is_platform_admin(auth.uid())
  OR (
    organization_id = get_user_organization_id(auth.uid())
    AND get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
  )
);
