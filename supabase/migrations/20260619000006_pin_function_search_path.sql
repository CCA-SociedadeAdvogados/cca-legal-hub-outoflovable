-- Hardening: fixar search_path nas funções que o tinham mutável.
-- Evita "search_path injection" em funções (em especial SECURITY DEFINER),
-- alinhando com a convenção já usada nas restantes funções do projeto.
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_cca_member_role() SET search_path = public, pg_temp;
ALTER FUNCTION public.enforce_cca_profile_defaults() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_contract_expiry_notifications() SET search_path = public, pg_temp;
ALTER FUNCTION public.notify_on_news_published() SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_get_financial_items_for_user(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_get_financial_summary_for_user(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_get_financial_summary_by_entity_for_user(uuid, uuid) SET search_path = public, pg_temp;
