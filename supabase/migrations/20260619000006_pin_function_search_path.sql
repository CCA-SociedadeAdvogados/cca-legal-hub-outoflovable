-- Hardening: fixar search_path nas funções que o tinham mutável.
-- Evita "search_path injection" em funções (em especial SECURITY DEFINER),
-- alinhando com a convenção já usada nas restantes funções do projeto.
--
-- Algumas destas funções existem apenas em produção (não são criadas pelo
-- conjunto de migrações). Iteramos sobre o pg_proc para alterar apenas as que
-- existem — assim a migração é idempotente e robusta também numa build de raiz.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'set_updated_at',
        'enforce_cca_member_role',
        'enforce_cca_profile_defaults',
        'create_contract_expiry_notifications',
        'notify_on_news_published',
        'fn_get_financial_items_for_user',
        'fn_get_financial_summary_for_user',
        'fn_get_financial_summary_by_entity_for_user'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;
