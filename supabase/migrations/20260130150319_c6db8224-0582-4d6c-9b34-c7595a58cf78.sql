-- Remover policies existentes
DROP POLICY IF EXISTS "Users can view compliance analyses for their org" 
  ON public.contract_compliance_analyses;
DROP POLICY IF EXISTS "Users can insert compliance analyses for their org" 
  ON public.contract_compliance_analyses;
DROP POLICY IF EXISTS "Users can update compliance analyses for their org" 
  ON public.contract_compliance_analyses;
DROP POLICY IF EXISTS "Admins can delete compliance analyses" 
  ON public.contract_compliance_analyses;

-- Recriar policy SELECT com platform_admin
CREATE POLICY "Users can view compliance analyses for their org"
  ON public.contract_compliance_analyses FOR SELECT
  USING (
    is_platform_admin(auth.uid()) 
    OR organization_id = get_user_organization_id(auth.uid())
  );

-- Recriar policy INSERT com platform_admin
CREATE POLICY "Users can insert compliance analyses for their org"
  ON public.contract_compliance_analyses FOR INSERT
  WITH CHECK (
    is_platform_admin(auth.uid()) 
    OR organization_id = get_user_organization_id(auth.uid())
  );

-- Recriar policy UPDATE com platform_admin
CREATE POLICY "Users can update compliance analyses for their org"
  ON public.contract_compliance_analyses FOR UPDATE
  USING (
    is_platform_admin(auth.uid()) 
    OR organization_id = get_user_organization_id(auth.uid())
  );

-- Recriar policy DELETE com platform_admin
CREATE POLICY "Admins can delete compliance analyses"
  ON public.contract_compliance_analyses FOR DELETE
  USING (
    is_platform_admin(auth.uid()) 
    OR (
      organization_id = get_user_organization_id(auth.uid()) 
      AND get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
    )
  );