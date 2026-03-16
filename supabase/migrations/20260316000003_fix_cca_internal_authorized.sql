-- ============================================================
-- Migration: corrigir fn_is_cca_internal_authorized
--
-- Problema: a função exigia que o email estivesse em cca_internal_users
-- (apenas 4 emails), bloqueando todos os restantes utilizadores CCA.
--
-- Especificação: TODOS os membros da organização CCA (client_code = 'C.0000',
-- org_type = 'cca_owner') devem ter acesso transversal a todos os clientes
-- activos da plataforma.
--
-- Fix: remover JOIN com cca_internal_users — verificar apenas membership
-- na org CCA. A tabela cca_internal_users mantém-se para gestão futura
-- de utilizadores com permissões elevadas (ex. platform admins), mas não
-- bloqueia o acesso transversal básico.
-- ============================================================

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
    where om.user_id = p_user_id
      and o.client_code = 'C.0000'
      and o.org_type = 'cca_owner'
  );
$function$;

REVOKE ALL ON FUNCTION public.fn_is_cca_internal_authorized(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_is_cca_internal_authorized(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_is_cca_internal_authorized(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
