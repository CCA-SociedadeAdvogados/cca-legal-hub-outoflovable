-- Drop and recreate profiles_safe view with corrected multi-org visibility logic
DROP VIEW IF EXISTS profiles_safe;

CREATE VIEW profiles_safe
WITH (security_invoker=on) AS
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
  -- Nome visível para: próprio, platform admin, ou membro da mesma organização
  CASE
    WHEN p.id = auth.uid() 
      OR is_platform_admin(auth.uid()) 
      OR EXISTS (
          SELECT 1 FROM organization_members om1
          JOIN organization_members om2 ON om1.organization_id = om2.organization_id
          WHERE om1.user_id = auth.uid() AND om2.user_id = p.id
        )
    THEN p.nome_completo
    ELSE NULL::text
  END AS nome_completo,
  -- Avatar visível para: próprio, platform admin, ou membro da mesma organização
  CASE
    WHEN p.id = auth.uid() 
      OR is_platform_admin(auth.uid())
      OR EXISTS (
          SELECT 1 FROM organization_members om1
          JOIN organization_members om2 ON om1.organization_id = om2.organization_id
          WHERE om1.user_id = auth.uid() AND om2.user_id = p.id
        )
    THEN p.avatar_url
    ELSE NULL::text
  END AS avatar_url,
  -- Email visível para: próprio, platform admin, ou membro da mesma organização
  CASE
    WHEN p.id = auth.uid() 
      OR is_platform_admin(auth.uid())
      OR EXISTS (
          SELECT 1 FROM organization_members om1
          JOIN organization_members om2 ON om1.organization_id = om2.organization_id
          WHERE om1.user_id = auth.uid() AND om2.user_id = p.id
        )
    THEN p.email
    ELSE NULL::text
  END AS email,
  -- Auth method visível para: próprio ou platform admin
  CASE
    WHEN p.id = auth.uid() OR is_platform_admin(auth.uid())
    THEN p.auth_method
    ELSE NULL::text
  END AS auth_method,
  -- SSO provider visível para: próprio ou platform admin
  CASE
    WHEN p.id = auth.uid() OR is_platform_admin(auth.uid())
    THEN p.sso_provider
    ELSE NULL::text
  END AS sso_provider,
  -- SSO external ID visível para: próprio ou platform admin
  CASE
    WHEN p.id = auth.uid() OR is_platform_admin(auth.uid())
    THEN p.sso_external_id
    ELSE NULL::text
  END AS sso_external_id
FROM profiles p
WHERE 
  p.id = auth.uid() 
  OR is_platform_admin(auth.uid()) 
  OR EXISTS (
      SELECT 1 FROM organization_members om1
      JOIN organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid() AND om2.user_id = p.id
    );