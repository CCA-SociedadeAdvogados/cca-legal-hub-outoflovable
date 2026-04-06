-- Adiciona lawyer_user_id (FK para profiles) à tabela organizations.
-- Substitui os campos de texto lawyer_name / lawyer_photo_url por uma referência
-- real a um perfil do sistema, permitindo puxar nome, email e foto automaticamente.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS lawyer_user_id UUID REFERENCES public.profiles(id);

-- Índice para JOINs rápidos
CREATE INDEX IF NOT EXISTS idx_organizations_lawyer_user_id
  ON public.organizations(lawyer_user_id);

COMMENT ON COLUMN public.organizations.lawyer_user_id
  IS 'Perfil do advogado responsável associado a esta organização/cliente';
