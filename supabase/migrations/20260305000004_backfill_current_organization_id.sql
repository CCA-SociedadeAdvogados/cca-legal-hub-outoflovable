-- Backfill profiles.current_organization_id for users who are members
-- of an organization but have NULL current_organization_id.
--
-- This is a safety net: the SSO edge function and switchOrganization mutation
-- should set this, but race conditions or edge cases can leave it NULL.
-- When NULL, RLS policies block ALL data for the user.

UPDATE public.profiles p
SET current_organization_id = (
  SELECT om.organization_id
  FROM public.organization_members om
  WHERE om.user_id = p.id
  ORDER BY om.created_at ASC
  LIMIT 1
)
WHERE p.current_organization_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = p.id
  );
