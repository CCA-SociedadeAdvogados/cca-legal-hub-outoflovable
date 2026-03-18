-- ============================================================
-- Migration: substituir lista de emails CCA hardcoded por tabela
--
-- Contexto: a função fn_is_cca_internal_authorized tinha os emails
-- dos utilizadores CCA internos hardcoded em SQL. Isto causava:
-- 1. Information disclosure (emails no histórico git)
-- 2. Impossibilidade de gerir utilizadores sem migrações de DB
-- 3. Risco de acesso quebrado em caso de mudança de email
--
-- Fix: criar tabela cca_internal_users + actualizar a função
-- ============================================================

-- ── 1. Tabela cca_internal_users ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cca_internal_users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique index on lowercased email (expressions not allowed in inline UNIQUE constraints)
CREATE UNIQUE INDEX IF NOT EXISTS cca_internal_users_email_unique
  ON public.cca_internal_users (lower(email));

-- RLS: apenas admins da plataforma conseguem gerir; a própria função
-- usa SECURITY DEFINER pelo que não precisa de SELECT policy extra.
ALTER TABLE public.cca_internal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage cca_internal_users"
  ON public.cca_internal_users
  FOR ALL
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- ── 2. Inserir utilizadores CCA existentes ────────────────────────

INSERT INTO public.cca_internal_users (email) VALUES
  ('al@cca.law'),
  ('asilva@cca.law'),
  ('jm@cca.law'),
  ('lfgaspar@cca.law')
ON CONFLICT DO NOTHING;

-- ── 3. Actualizar fn_is_cca_internal_authorized ───────────────────

CREATE OR REPLACE FUNCTION public.fn_is_cca_internal_authorized(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  select exists (
    select 1
    from public.organization_members om
    join public.organizations o
      on o.id = om.organization_id
    join public.profiles p
      on p.id = om.user_id
    join public.cca_internal_users ciu
      on lower(ciu.email) = lower(p.email)
    where om.user_id = p_user_id
      and o.client_code = 'C.0000'
      and o.org_type = 'cca_owner'
  );
$function$;

REVOKE ALL ON FUNCTION public.fn_is_cca_internal_authorized(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_is_cca_internal_authorized(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_cca_internal_authorized(uuid) TO service_role;

-- ── Reload PostgREST schema cache ──────────────────────────────────
NOTIFY pgrst, 'reload schema';
