-- ============================================================================
-- RLS policies for platform_users and organizations tables
-- platform_users: authenticated user reads own record only
-- organizations: CCA authenticated users (SSO) read all records
-- ============================================================================

-- ── platform_users ─────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS platform_users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users read own platform_users record" ON platform_users;
DROP POLICY IF EXISTS "Service role manages platform_users" ON platform_users;

-- Authenticated user can only read their own record (simple direct comparison)
CREATE POLICY "Users read own platform_users record"
  ON platform_users FOR SELECT
  TO authenticated
  USING (email = current_setting('request.jwt.claims', true)::json ->> 'email');

-- NOTE: service_role bypasses RLS by default in Supabase — no explicit policy needed

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
