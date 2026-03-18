-- Fix infinite recursion in platform_users RLS policy
-- Drop ALL existing policies and recreate with a non-recursive approach
-- Guarded with a DO block in case the table does not exist yet.

DO $$
DECLARE
  pol RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'platform_users'
  ) THEN
    RETURN; -- table not yet created; nothing to do
  END IF;

  -- Drop all existing policies on platform_users
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'platform_users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON platform_users', pol.policyname);
  END LOOP;

  -- Simple SELECT policy: user reads own record via JWT email claim
  -- Uses current_setting to avoid any potential recursion through auth.jwt()
  EXECUTE $pol$
    CREATE POLICY "platform_users_select_own"
      ON platform_users FOR SELECT
      TO authenticated
      USING (
        email = (
          nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email'
        )
      )
  $pol$;

  -- Allow service_role full access (UPDATE for SSO function to mark is_active)
  -- NOTE: service_role bypasses RLS by default, but explicit policy avoids edge cases
  EXECUTE $pol$
    CREATE POLICY "platform_users_service_role"
      ON platform_users FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true)
  $pol$;
END
$$;
