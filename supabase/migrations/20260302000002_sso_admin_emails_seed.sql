-- Seed initial SSO admin emails
-- These users receive the 'admin' role automatically on SSO login

INSERT INTO public.sso_admin_emails (email, role, notes) VALUES
  ('asilva@cca.law',   'admin', 'Administrador SSO'),
  ('lfgaspar@cca.law', 'admin', 'Administrador SSO'),
  ('al@cca.law',       'admin', 'Administrador SSO'),
  ('jm@cca.law',       'admin', 'Administrador SSO')
ON CONFLICT (email) DO NOTHING;
