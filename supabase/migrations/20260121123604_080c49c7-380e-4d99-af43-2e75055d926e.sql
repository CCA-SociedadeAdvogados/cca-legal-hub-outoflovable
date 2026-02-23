-- Fix profiles table RLS: Users should only be able to see their OWN profile
-- For viewing other organization members, use the profiles_safe view instead

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view profiles in their organization or platform admin" ON public.profiles;

-- Create a new restrictive policy: Users can ONLY view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Platform admins can view all profiles for administrative purposes
CREATE POLICY "Platform admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_platform_admin(auth.uid()));