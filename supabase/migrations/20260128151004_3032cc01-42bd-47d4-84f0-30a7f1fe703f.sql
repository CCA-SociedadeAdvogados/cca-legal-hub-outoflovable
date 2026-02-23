-- Fix profiles_table_email_exposure: Remove overly permissive platform admin policy on profiles table
-- Platform admins should use profiles_safe view which has built-in access control

DROP POLICY IF EXISTS "Platform admins can view all profiles" ON public.profiles;

-- Add a comment to document this security decision
COMMENT ON TABLE public.profiles IS 'User profile data. Direct SELECT access is restricted to own profile only (auth.uid() = id). Platform admins must use profiles_safe view for cross-user lookups to maintain security boundaries.';