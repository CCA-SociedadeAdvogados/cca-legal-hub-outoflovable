-- Migração: política RLS para utilizadores CCA (SSO) verem contratos de todas as organizações
--
-- Contexto:
--   Os utilizadores CCA (auth_method = 'sso_cca') precisam de aceder a contratos de
--   qualquer organização cliente quando pesquisam por ID Jvris na página Financeiro.
--   A política existente "Users can view contracts in their organization" limita a visão
--   ao org atual (CCA_Teste), impedindo o acesso cross-org.
--
-- Esta política adiciona uma regra de SELECT que permite a utilizadores SSO CCA
--   verem contratos de qualquer organização.
--
-- Segurança:
--   • Apenas utilizadores com auth_method = 'sso_cca' beneficiam desta política
--   • Utilizadores org (locais) continuam limitados à sua organização pela política existente
--   • As políticas INSERT/UPDATE/DELETE não são alteradas

CREATE POLICY "SSO CCA users can view contracts in all organizations"
ON public.contratos
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.auth_method = 'sso_cca'
  )
);

-- Nota: a política existente "Users can view contracts in their organization" continua
-- ativa. Como o PostgreSQL avalia políticas com OR lógico (uma basta ser verdadeira),
-- utilizadores org ainda acedem só à sua org, e utilizadores SSO acedem a todas.
