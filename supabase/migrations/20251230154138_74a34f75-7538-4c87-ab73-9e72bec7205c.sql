-- Adicionar demo user como platform admin
INSERT INTO public.platform_admins (user_id, notes)
VALUES ('54406856-74f8-4755-9d51-11516bb45c39', 'Demo User - Platform Admin')
ON CONFLICT (user_id) DO NOTHING;

-- Adicionar política para platform admins verem todas as organizações
CREATE POLICY "Platform admins can view all organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  user_belongs_to_organization(auth.uid(), id)
  OR is_platform_admin(auth.uid())
);

-- Adicionar política para platform admins verem todos os profiles
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;

CREATE POLICY "Users can view profiles in their organization or platform admins"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (current_organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ))
  OR (id = auth.uid())
  OR is_platform_admin(auth.uid())
);

-- Adicionar política para platform admins verem todos os organization_members
DROP POLICY IF EXISTS "Users can view members of their organizations" ON public.organization_members;

CREATE POLICY "Users can view members of their organizations or platform admins"
ON public.organization_members
FOR SELECT
TO authenticated
USING (
  user_belongs_to_organization(auth.uid(), organization_id)
  OR is_platform_admin(auth.uid())
);