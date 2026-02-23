-- Fix RLS policies for client_content_blocks - arguments were inverted
DROP POLICY IF EXISTS "Members can read content blocks" ON public.client_content_blocks;
DROP POLICY IF EXISTS "Admins can manage content blocks" ON public.client_content_blocks;

CREATE POLICY "Members can read content blocks"
ON public.client_content_blocks
FOR SELECT
USING (
  public.user_belongs_to_organization(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Admins can manage content blocks"
ON public.client_content_blocks
FOR ALL
USING (
  public.is_platform_admin(auth.uid())
);

-- Fix RLS policies for client_home_config - same issue
DROP POLICY IF EXISTS "Members can read home config" ON public.client_home_config;
DROP POLICY IF EXISTS "Admins can manage home config" ON public.client_home_config;

CREATE POLICY "Members can read home config"
ON public.client_home_config
FOR SELECT
USING (
  public.user_belongs_to_organization(auth.uid(), organization_id)
  OR public.is_platform_admin(auth.uid())
);

CREATE POLICY "Admins can manage home config"
ON public.client_home_config
FOR ALL
USING (
  public.is_platform_admin(auth.uid())
);