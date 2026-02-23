-- Table for SSO state persistence (CSRF protection)
CREATE TABLE public.sso_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL UNIQUE,
  nonce TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes')
);

-- Index for fast state lookups
CREATE INDEX idx_sso_states_state ON public.sso_states(state);

-- Index for cleanup of expired states
CREATE INDEX idx_sso_states_expires_at ON public.sso_states(expires_at);

-- RLS: only service role can access (edge functions use service role)
ALTER TABLE public.sso_states ENABLE ROW LEVEL SECURITY;

-- Function to cleanup expired states
CREATE OR REPLACE FUNCTION public.cleanup_expired_sso_states()
RETURNS void AS $$
BEGIN
  DELETE FROM public.sso_states WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;