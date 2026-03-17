-- Drop constraint organization_members_user_type_check
--
-- Este constraint foi adicionado directamente ao DB sem migration e sem
-- implementação correspondente no código. Nenhuma edge function, RPC ou
-- query define o campo user_type, pelo que o constraint bloqueia toda a
-- criação de utilizadores via onboarding e SSO.
--
-- Se no futuro for necessário distinguir user_type (ex: 'internal'/'external'),
-- deve ser feito via migration própria com coluna, default e implementação.

ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_user_type_check;
