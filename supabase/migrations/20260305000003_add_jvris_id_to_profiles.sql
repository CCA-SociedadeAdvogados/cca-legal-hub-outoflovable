-- Migração: adicionar coluna jvris_id à tabela profiles
--
-- O ID Jvris identifica o utilizador no sistema Jvris de gestão de matérias legais
-- da CCA - Sociedade de Advogados. É lido de forma assíncrona do ficheiro SharePoint
-- configurado em CCA_JVRIS_USERS_FILE no momento do login SSO.
--
-- Regras:
--   • Nullable: o login NÃO deve falhar se o ID não for encontrado no ficheiro
--   • Aplicável apenas a utilizadores CCA (auth_method = 'sso_cca')
--   • Atualizado automaticamente em cada login SSO (não requer gestão manual)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS jvris_id text;

COMMENT ON COLUMN public.profiles.jvris_id IS
  'ID do utilizador no sistema Jvris (ex: C.0042). '
  'Lido assincronamente do ficheiro SharePoint no momento do login SSO. '
  'Nullable — o login não falha se o ID não for encontrado.';
