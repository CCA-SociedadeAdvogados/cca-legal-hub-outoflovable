-- Fix assign_default_department trigger to fire on INSERT OR UPDATE
--
-- Problem: The trigger only fired on INSERT. When sso-cca does
-- ON CONFLICT DO UPDATE on organization_members, the trigger doesn't fire,
-- so returning SSO users never get assigned to the default "Geral" department.
--
-- Fix: Change trigger to AFTER INSERT OR UPDATE so it catches upserts too.
-- The function already uses ON CONFLICT DO NOTHING, so it's idempotent.

DROP TRIGGER IF EXISTS on_member_added ON public.organization_members;

CREATE TRIGGER on_member_added
  AFTER INSERT OR UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_department();
