-- Bootstrap platform_admins for users already registered in the system.
--
-- Problem being solved: Chicken-and-egg situation where:
--   1. Only platform_admins can access the admin panel
--   2. platform_admins is only populated on SSO login (via sso_admin_emails)
--   3. But if sso_admin_emails was just created, no one is in platform_admins yet
--
-- This migration reads sso_admin_emails (seeded in 20260302000002) and inserts
-- any already-registered users (found in auth.users) into platform_admins.
-- If a user hasn't logged in yet, they'll be added on their first SSO login.
--
-- Safe to run multiple times: ON CONFLICT (user_id) DO NOTHING

INSERT INTO public.platform_admins (user_id, notes)
SELECT
  au.id,
  'Bootstrapped from sso_admin_emails — ' || sae.email
FROM auth.users au
JOIN public.sso_admin_emails sae
  ON lower(au.email) = lower(sae.email)
  AND sae.role = 'admin'
ON CONFLICT (user_id) DO NOTHING;
