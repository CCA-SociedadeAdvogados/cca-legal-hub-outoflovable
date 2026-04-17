-- ============================================================
-- Migration: fn_anonymize_user_data — atomic GDPR Art. 17 erasure
--
-- Problem: data-retention-cron edge function performed 8+ sequential
-- updates/deletes via PostgREST. If one failed mid-way the user
-- ended up partially anonymised (e.g. profile renamed but contracts
-- still referenced the original user id).
--
-- This RPC wraps the entire anonymisation flow in a single Postgres
-- transaction. Either the whole user is anonymised, or nothing is.
--
-- The edge function still calls supabase.auth.admin.deleteUser()
-- afterwards because that has to go through Supabase's admin API
-- and cannot be done from SQL.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_anonymize_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anon_email text := 'deleted_' || substr(p_user_id::text, 1, 8) || '@deleted.local';
  v_now timestamptz := now();
  v_audit_count int := 0;
  v_contract_count int := 0;
BEGIN
  -- 1. Anonymise audit_logs (kept for legal compliance, PII removed)
  UPDATE public.audit_logs
     SET user_email = 'DELETED_USER',
         metadata = COALESCE(metadata, '{}'::jsonb)
                    || jsonb_build_object(
                         'anonymized', true,
                         'original_user_id', p_user_id,
                         'anonymized_at', v_now
                       )
   WHERE user_id = p_user_id;
  GET DIAGNOSTICS v_audit_count = ROW_COUNT;

  -- 2. Anonymise auth_activity_logs
  UPDATE public.auth_activity_logs
     SET ip_address = NULL,
         user_agent = NULL,
         metadata = COALESCE(metadata, '{}'::jsonb)
                    || jsonb_build_object('anonymized', true)
   WHERE user_id = p_user_id;

  -- 3. Delete notifications (no legal need to retain)
  DELETE FROM public.notifications WHERE user_id = p_user_id;

  -- 4. Delete user consents
  DELETE FROM public.user_consents WHERE user_id = p_user_id;

  -- 5. Anonymise contratos (kept for legal compliance, creator removed)
  UPDATE public.contratos
     SET created_by_id = NULL,
         updated_by_id = NULL,
         responsavel_interno_id = NULL,
         updated_at = v_now
   WHERE created_by_id = p_user_id
      OR updated_by_id = p_user_id
      OR responsavel_interno_id = p_user_id;
  GET DIAGNOSTICS v_contract_count = ROW_COUNT;

  -- 6. Anonymise templates
  UPDATE public.templates
     SET created_by_id = NULL,
         updated_by_id = NULL
   WHERE created_by_id = p_user_id
      OR updated_by_id = p_user_id;

  -- 7. Anonymise documentos_gerados
  UPDATE public.documentos_gerados
     SET created_by_id = NULL
   WHERE created_by_id = p_user_id;

  -- 8. Remove organisation memberships
  DELETE FROM public.organization_members WHERE user_id = p_user_id;

  -- 9. Anonymise profile (auth.users itself is removed by the edge function)
  UPDATE public.profiles
     SET email = v_anon_email,
         nome_completo = 'Utilizador Eliminado',
         avatar_url = NULL,
         departamento = NULL,
         sso_external_id = NULL,
         sso_provider = NULL
   WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'anonymized_at', v_now,
    'audit_logs_anonymized', v_audit_count,
    'contracts_anonymized', v_contract_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_anonymize_user_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_anonymize_user_data(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
