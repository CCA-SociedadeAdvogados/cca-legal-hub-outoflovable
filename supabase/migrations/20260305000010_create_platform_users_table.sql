-- ============================================================================
-- Create platform_users table
-- Pre-seeded registry of CCA internal users with their profile data.
-- Used by the sso-cca edge function for JIT provisioning enrichment.
-- Must run before 20260306000001_platform_users_organizations_rls.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_users (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL UNIQUE,
  full_name   text,
  role        text,
  department  text,
  job_title   text,
  is_active   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS immediately so no data leaks before policies are created
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;

-- Index for the SSO lookup pattern (.eq("email", email))
CREATE INDEX IF NOT EXISTS platform_users_email_idx ON platform_users (email);

COMMENT ON TABLE platform_users IS
  'Pre-seeded CCA internal user registry. Populated manually or via admin tooling. '
  'Read by sso-cca function to enrich JIT-provisioned profiles.';
