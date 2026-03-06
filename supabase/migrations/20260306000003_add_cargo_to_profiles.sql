-- Adicionar coluna cargo à tabela profiles
--
-- A edge function sso-cca já escreve cargo (job_title) no perfil
-- quando o utilizador existe em platform_users. Sem esta coluna,
-- o update falhava silenciosamente, impedindo também que
-- onboarding_completed fosse persistido na mesma query.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cargo text;

COMMENT ON COLUMN public.profiles.cargo IS
  'Cargo/função do utilizador (ex: "Advogado Sénior", "Associado"). '
  'Preenchido automaticamente a partir de platform_users.job_title no login SSO.';
