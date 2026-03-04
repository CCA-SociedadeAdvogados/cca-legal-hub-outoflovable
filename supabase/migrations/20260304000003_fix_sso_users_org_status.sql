-- Fix SSO users without organization or with stale onboarding status
--
-- Problem 1: Previous backfill migration (20260203154213) only inserted into
-- organization_members but never updated profiles.current_organization_id
-- or profiles.onboarding_completed. Users who logged in before the edge
-- function was updated to always set those fields are stuck.
--
-- Problem 2: Some SSO users may still be missing their organization membership
-- (e.g. created after the first backfill but before a fix landed).
--
-- This migration is idempotent and safe to run multiple times.

-- Step 1: Ensure all SSO users have org membership in CCA_Teste
INSERT INTO organization_members (organization_id, user_id, role)
SELECT
  'e33bf0c9-71b9-491b-8054-d4c88d8bb4ee'::uuid,
  p.id,
  'editor'::app_role
FROM profiles p
WHERE p.auth_method = 'sso_cca'
  AND NOT EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = p.id
      AND om.organization_id = 'e33bf0c9-71b9-491b-8054-d4c88d8bb4ee'
  )
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- Step 2: Set current_organization_id for SSO users that still have it NULL
UPDATE profiles
SET current_organization_id = 'e33bf0c9-71b9-491b-8054-d4c88d8bb4ee'::uuid
WHERE auth_method = 'sso_cca'
  AND current_organization_id IS NULL;

-- Step 3: Mark onboarding as completed for all SSO users
-- SSO users skip the onboarding flow — they are provisioned directly
UPDATE profiles
SET onboarding_completed = true
WHERE auth_method = 'sso_cca'
  AND (onboarding_completed IS NULL OR onboarding_completed = false);
