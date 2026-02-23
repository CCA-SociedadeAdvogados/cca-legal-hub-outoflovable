-- Remover policy antiga
DROP POLICY IF EXISTS "Admins can manage members" ON public.organization_members;

-- Criar nova policy que inclui Platform Admins
CREATE POLICY "Platform admins and org admins can manage members"
ON public.organization_members
FOR ALL
TO authenticated
USING (
  get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  OR is_platform_admin(auth.uid())
)
WITH CHECK (
  get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin')
  OR is_platform_admin(auth.uid())
);