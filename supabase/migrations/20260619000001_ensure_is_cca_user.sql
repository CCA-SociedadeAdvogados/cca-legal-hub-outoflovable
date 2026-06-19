-- Garante o helper is_cca_user — existe em produção mas não era criado por
-- nenhuma migração. Numa build de raiz (Supabase Preview / db push) as políticas
-- de segurança que dependem dele (ver 20260619000004) falhavam com
-- "function is_cca_user(uuid) does not exist".
--
-- Mantém-se numa migração dedicada e anterior (statement único) para evitar
-- qualquer ambiguidade de ordenação dentro de um ficheiro com várias instruções.
CREATE OR REPLACE FUNCTION public.is_cca_user(_uid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    JOIN public.organizations o ON o.id = om.organization_id
    WHERE om.user_id = _uid
      AND o.org_type = 'cca_owner'
  )
$$;
