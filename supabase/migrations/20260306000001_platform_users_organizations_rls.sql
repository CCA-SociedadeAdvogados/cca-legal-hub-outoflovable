-- ============================================================================
-- RLS policies for platform_users and organizations tables
-- platform_users: authenticated user reads own record only
-- organizations: CCA authenticated users (SSO) read all records
-- ============================================================================

-- ── platform_users ─────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS platform_users ENABLE ROW LEVEL SECURITY;

-- Authenticated user can only read their own record
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'platform_users'
    AND policyname = 'Users read own platform_users record'
  ) THEN
    CREATE POLICY "Users read own platform_users record"
      ON platform_users FOR SELECT
      TO authenticated
      USING (email = (auth.jwt() ->> 'email'));
  END IF;
END
$$;

-- Service role (edge functions) can update platform_users (e.g. is_active, updated_at)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'platform_users'
    AND policyname = 'Service role manages platform_users'
  ) THEN
    CREATE POLICY "Service role manages platform_users"
      ON platform_users FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- ── organizations ──────────────────────────────────────────────────────────
-- CCA internal users (auth_method = 'sso_cca') can read all organizations.
-- External users (org_user, org_manager) cannot access this table.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organizations'
    AND policyname = 'CCA users read all organizations'
  ) THEN
    CREATE POLICY "CCA users read all organizations"
      ON organizations FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
          AND p.auth_method = 'sso_cca'
        )
      );
  END IF;
END
$$;
