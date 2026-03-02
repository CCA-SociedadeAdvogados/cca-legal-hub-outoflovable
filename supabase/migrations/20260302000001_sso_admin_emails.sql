-- Table to manage SSO administrator emails
-- Platform admins can add specific email addresses that receive admin/editor roles on SSO login
-- This takes priority over Azure AD group-based role assignment

CREATE TABLE public.sso_admin_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'editor')),
  notes TEXT,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sso_admin_emails_email_unique UNIQUE (email)
);

-- Only service role (edge functions) and platform admins can access
ALTER TABLE public.sso_admin_emails ENABLE ROW LEVEL SECURITY;

-- Platform admins can view all entries
CREATE POLICY "platform_admins_select_sso_admin_emails"
  ON public.sso_admin_emails
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid()
    )
  );

-- Platform admins can insert
CREATE POLICY "platform_admins_insert_sso_admin_emails"
  ON public.sso_admin_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid()
    )
  );

-- Platform admins can update
CREATE POLICY "platform_admins_update_sso_admin_emails"
  ON public.sso_admin_emails
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid()
    )
  );

-- Platform admins can delete
CREATE POLICY "platform_admins_delete_sso_admin_emails"
  ON public.sso_admin_emails
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins
      WHERE user_id = auth.uid()
    )
  );

-- Index for fast email lookups (edge function queries by email on every SSO login)
CREATE INDEX idx_sso_admin_emails_email ON public.sso_admin_emails(email);

-- Grant service role full access (used by edge functions)
GRANT ALL ON public.sso_admin_emails TO service_role;
