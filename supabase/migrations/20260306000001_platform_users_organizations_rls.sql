-- ============================================================================
-- RLS policies for platform_users and organizations tables
-- platform_users: authenticated user reads own record only
-- organizations: CCA authenticated users (SSO) read all records
-- ============================================================================

-- ── platform_users ─────────────────────────────────────────────────────────
-- Table is created in 20260305000010_create_platform_users_table.sql.
-- Guard here with a DO block so this migration is safe on any environment.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'platform_users'
  ) THEN
    ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users read own platform_users record" ON platform_users;
    DROP POLICY IF EXISTS "Service role manages platform_users" ON platform_users;

    -- Authenticated user can only read their own record (simple direct comparison)
    EXECUTE $pol$
      CREATE POLICY "Users read own platform_users record"
        ON platform_users FOR SELECT
        TO authenticated
        USING (email = current_setting('request.jwt.claims', true)::json ->> 'email')
    $pol$;

    -- NOTE: service_role bypasses RLS by default in Supabase — no explicit policy needed
  END IF;
END
$$;

-- ── organizations ──────────────────────────────────────────────────────────
-- CCA internal users (auth_method = 'sso_cca') can read all organizations.
-- External users (org_user, org_manager) cannot access this table.

DROP POLICY IF EXISTS "CCA users read all organizations" ON organizations;

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
