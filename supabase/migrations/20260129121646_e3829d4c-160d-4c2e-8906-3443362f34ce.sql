-- Recriar a view profiles_safe com suporte para platform admins
DROP VIEW IF EXISTS public.profiles_safe;

CREATE VIEW public.profiles_safe
WITH (security_invoker = on)
AS
SELECT
  p.id,
  p.departamento,
  p.current_organization_id,
  p.onboarding_completed,
  p.created_at,
  p.updated_at,
  p.login_attempts,
  p.locked_until,
  p.last_login_at,
  p.two_factor_enabled,
  p.two_factor_verified_at,
  -- Campos sempre visíveis para o próprio utilizador, platform admins, ou admins da org
  CASE
    WHEN p.id = auth.uid() 
      OR public.is_platform_admin(auth.uid())
      OR public.get_user_org_role(auth.uid(), p.current_organization_id) = ANY(ARRAY['owner', 'admin']::app_role[])
    THEN p.nome_completo
    ELSE NULL
  END AS nome_completo,
  CASE
    WHEN p.id = auth.uid() 
      OR public.is_platform_admin(auth.uid())
      OR public.get_user_org_role(auth.uid(), p.current_organization_id) = ANY(ARRAY['owner', 'admin']::app_role[])
    THEN p.avatar_url
    ELSE NULL
  END AS avatar_url,
  -- Campos sensíveis: visíveis para o próprio, platform admins, ou admins da org
  CASE
    WHEN p.id = auth.uid() 
      OR public.is_platform_admin(auth.uid())
      OR public.get_user_org_role(auth.uid(), p.current_organization_id) = ANY(ARRAY['owner', 'admin']::app_role[])
    THEN p.email
    ELSE NULL
  END AS email,
  CASE
    WHEN p.id = auth.uid() 
      OR public.is_platform_admin(auth.uid())
      OR public.get_user_org_role(auth.uid(), p.current_organization_id) = ANY(ARRAY['owner', 'admin']::app_role[])
    THEN p.auth_method
    ELSE NULL
  END AS auth_method,
  CASE
    WHEN p.id = auth.uid() 
      OR public.is_platform_admin(auth.uid())
      OR public.get_user_org_role(auth.uid(), p.current_organization_id) = ANY(ARRAY['owner', 'admin']::app_role[])
    THEN p.sso_provider
    ELSE NULL
  END AS sso_provider,
  CASE
    WHEN p.id = auth.uid() 
      OR public.is_platform_admin(auth.uid())
      OR public.get_user_org_role(auth.uid(), p.current_organization_id) = ANY(ARRAY['owner', 'admin']::app_role[])
    THEN p.sso_external_id
    ELSE NULL
  END AS sso_external_id
FROM public.profiles p
WHERE 
  p.id = auth.uid()
  OR public.is_platform_admin(auth.uid())
  OR p.current_organization_id IN (
    SELECT organization_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid()
  );