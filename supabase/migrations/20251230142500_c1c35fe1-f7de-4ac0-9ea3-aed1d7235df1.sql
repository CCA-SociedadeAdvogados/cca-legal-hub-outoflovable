-- Create a secure view for profiles with field-level access control
-- Basic fields visible to all organization members
-- Sensitive fields only visible to admins/owners

CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT 
  p.id,
  p.nome_completo,
  p.avatar_url,
  p.departamento,
  p.current_organization_id,
  p.onboarding_completed,
  p.created_at,
  p.updated_at,
  -- Sensitive fields: only visible to admins/owners or the user themselves
  CASE 
    WHEN p.id = auth.uid() 
      OR public.get_user_org_role(auth.uid(), p.current_organization_id) IN ('owner', 'admin') 
    THEN p.email 
    ELSE NULL 
  END as email,
  CASE 
    WHEN p.id = auth.uid() 
      OR public.get_user_org_role(auth.uid(), p.current_organization_id) IN ('owner', 'admin') 
    THEN p.auth_method 
    ELSE NULL 
  END as auth_method,
  CASE 
    WHEN p.id = auth.uid() 
      OR public.get_user_org_role(auth.uid(), p.current_organization_id) IN ('owner', 'admin') 
    THEN p.sso_provider 
    ELSE NULL 
  END as sso_provider,
  CASE 
    WHEN p.id = auth.uid() 
      OR public.get_user_org_role(auth.uid(), p.current_organization_id) IN ('owner', 'admin') 
    THEN p.sso_external_id 
    ELSE NULL 
  END as sso_external_id,
  CASE 
    WHEN p.id = auth.uid() 
      OR public.get_user_org_role(auth.uid(), p.current_organization_id) IN ('owner', 'admin') 
    THEN p.login_attempts 
    ELSE NULL 
  END as login_attempts,
  CASE 
    WHEN p.id = auth.uid() 
      OR public.get_user_org_role(auth.uid(), p.current_organization_id) IN ('owner', 'admin') 
    THEN p.locked_until 
    ELSE NULL 
  END as locked_until,
  CASE 
    WHEN p.id = auth.uid() 
      OR public.get_user_org_role(auth.uid(), p.current_organization_id) IN ('owner', 'admin') 
    THEN p.last_login_at 
    ELSE NULL 
  END as last_login_at,
  CASE 
    WHEN p.id = auth.uid() 
      OR public.get_user_org_role(auth.uid(), p.current_organization_id) IN ('owner', 'admin') 
    THEN p.two_factor_enabled 
    ELSE NULL 
  END as two_factor_enabled,
  CASE 
    WHEN p.id = auth.uid() 
      OR public.get_user_org_role(auth.uid(), p.current_organization_id) IN ('owner', 'admin') 
    THEN p.two_factor_verified_at 
    ELSE NULL 
  END as two_factor_verified_at
FROM public.profiles p
WHERE 
  -- User can see their own profile
  p.id = auth.uid()
  -- Or profiles in their organization
  OR p.current_organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  );

-- Grant access to the view
GRANT SELECT ON public.profiles_safe TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.profiles_safe IS 'Secure view of profiles with field-level access control. Basic fields (nome_completo, avatar_url, departamento) visible to all org members. Sensitive fields (email, auth_method, SSO, login data) only visible to admins/owners or the profile owner.';