-- Fix assign_sso_user_to_organization: never downgrade an existing role
--
-- Problem: the previous version used ON CONFLICT DO UPDATE SET role = EXCLUDED.role,
-- which overwrites owner/admin roles with the SSO default (editor) on every login.
-- A user manually set as 'owner' would be demoted to 'editor' at next SSO login.
--
-- Fix: only upgrade roles, never downgrade.
-- Priority: owner(4) > admin(3) > editor(2) > viewer(1)
-- If the existing role has equal or higher priority, keep it.
-- If the SSO-assigned role has higher priority, upgrade to it.

CREATE OR REPLACE FUNCTION public.assign_sso_user_to_organization(
  p_user_id uuid,
  p_organization_id uuid,
  p_role app_role DEFAULT 'editor'::app_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (p_organization_id, p_user_id, p_role)
  ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role = CASE
      -- Role priority: owner=4, admin=3, editor=2, viewer=1
      -- Keep the existing role if it has equal or higher priority
      WHEN (
        CASE organization_members.role
          WHEN 'owner'  THEN 4
          WHEN 'admin'  THEN 3
          WHEN 'editor' THEN 2
          ELSE 1
        END
      ) >= (
        CASE EXCLUDED.role
          WHEN 'owner'  THEN 4
          WHEN 'admin'  THEN 3
          WHEN 'editor' THEN 2
          ELSE 1
        END
      ) THEN organization_members.role  -- keep existing (higher or equal)
      ELSE EXCLUDED.role                -- upgrade to SSO-assigned (higher)
    END;

  -- Set current_organization_id only if not already defined
  UPDATE profiles
  SET current_organization_id = p_organization_id
  WHERE id = p_user_id
    AND current_organization_id IS NULL;

  RETURN TRUE;
END;
$$;

-- Restore roles that were incorrectly downgraded for known platform admins.
-- Platform admins should have at minimum 'admin' role in the org.
UPDATE organization_members om
SET role = 'admin'
FROM platform_admins pa
WHERE om.user_id = pa.user_id
  AND om.organization_id = 'e33bf0c9-71b9-491b-8054-d4c88d8bb4ee'
  AND om.role = 'editor';
