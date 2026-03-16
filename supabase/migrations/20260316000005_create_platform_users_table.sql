-- ============================================================================
-- Create platform_users table
-- Pre-seeded user registry for SSO CCA enrichment (name, role, department).
-- The SSO edge function does a soft lookup here; absence of a record does NOT
-- block login — it simply falls back to JIT provisioning from Azure AD tokens.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_users (
  email        text PRIMARY KEY,
  full_name    text,
  role         text,
  department   text,
  job_title    text,
  organization text,
  auth_method  text DEFAULT 'sso_cca',
  is_active    boolean DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for the soft lookup in the SSO edge function
CREATE INDEX IF NOT EXISTS platform_users_email_idx ON public.platform_users (email);

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.platform_users ENABLE ROW LEVEL SECURITY;

-- Authenticated user reads their own record only (JWT email claim)
CREATE POLICY "platform_users_select_own"
  ON public.platform_users FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- Service role manages all records (bypasses RLS by default in Supabase,
-- but an explicit USING(true) policy makes intent clear)
CREATE POLICY "platform_users_service_role"
  ON public.platform_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Fix the RLS migrations that assumed the table already existed ────────────
-- 20260306000001 and 20260306000002 may have failed silently. Re-apply here.
-- The CREATE POLICY above already replaces what those migrations intended.
-- Nothing more to do — policies are created above.
