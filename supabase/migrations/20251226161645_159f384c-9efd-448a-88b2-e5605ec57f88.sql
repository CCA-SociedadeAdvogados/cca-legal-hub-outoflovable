-- Drop the existing restrictive SELECT policy and create a public one for anon users
DROP POLICY IF EXISTS "Feature flags are readable by all authenticated users" ON public.feature_flags;

-- Create a policy that allows BOTH anon and authenticated users to read feature flags
CREATE POLICY "Feature flags are publicly readable"
ON public.feature_flags
FOR SELECT
TO anon, authenticated
USING (true);