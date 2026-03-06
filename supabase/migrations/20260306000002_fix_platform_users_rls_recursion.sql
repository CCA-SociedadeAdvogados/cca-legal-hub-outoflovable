-- Fix infinite recursion in platform_users RLS policy
-- Drop ALL existing policies and recreate with a non-recursive approach

-- Drop all existing policies on platform_users
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'platform_users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON platform_users', pol.policyname);
  END LOOP;
END
$$;

-- Simple SELECT policy: user reads own record via JWT email claim
-- Uses current_setting to avoid any potential recursion through auth.jwt()
CREATE POLICY "platform_users_select_own"
  ON platform_users FOR SELECT
  TO authenticated
  USING (
    email = (
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email'
    )
  );

-- Allow service_role full access (UPDATE for SSO function to mark is_active)
-- NOTE: service_role bypasses RLS by default, but explicit policy avoids edge cases
CREATE POLICY "platform_users_service_role"
  ON platform_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
