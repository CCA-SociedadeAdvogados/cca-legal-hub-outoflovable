-- Backfill organization_members for SSO users who have a profile but no membership
-- in the CCA_Teste organization. This fixes users who slipped through when the
-- assign_sso_user_to_organization RPC failed silently during SSO login.

INSERT INTO organization_members (organization_id, user_id, role)
SELECT
  'e33bf0c9-71b9-491b-8054-d4c88d8bb4ee',  -- CCA_Teste org
  p.id,
  'editor'                                    -- default SSO role
FROM profiles p
WHERE p.auth_method = 'sso_cca'
  AND NOT EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = p.id
      AND om.organization_id = 'e33bf0c9-71b9-491b-8054-d4c88d8bb4ee'
  );

-- Also ensure current_organization_id is set for these users
UPDATE profiles p
SET current_organization_id = 'e33bf0c9-71b9-491b-8054-d4c88d8bb4ee'
WHERE p.auth_method = 'sso_cca'
  AND p.current_organization_id IS NULL;
