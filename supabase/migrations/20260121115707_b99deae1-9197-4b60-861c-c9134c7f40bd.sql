-- Fix feature_flags security: Restrict access to authenticated users only
-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Feature flags are publicly readable" ON public.feature_flags;

-- Create a new policy that only allows authenticated users to read feature flags
CREATE POLICY "Feature flags are readable by authenticated users"
ON public.feature_flags
FOR SELECT
TO authenticated
USING (true);

-- Note: The existing "Feature flags are editable by service role only" policy remains
-- which correctly restricts INSERT/UPDATE/DELETE to service role