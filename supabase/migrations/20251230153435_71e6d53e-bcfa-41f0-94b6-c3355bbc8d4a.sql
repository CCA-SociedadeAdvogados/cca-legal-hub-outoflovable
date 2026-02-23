-- Tabela para super admins da plataforma
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid,
  notes text
);

-- Ativar RLS
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Função para verificar se é platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id
  )
$$;

-- Políticas RLS para platform_admins (apenas platform admins podem ver)
CREATE POLICY "Platform admins can view all platform admins"
ON public.platform_admins
FOR SELECT
TO authenticated
USING (is_platform_admin(auth.uid()));

-- Remover política antiga de contratos
DROP POLICY IF EXISTS "Users can view contracts in their organization" ON public.contratos;

-- Nova política que inclui platform admins
CREATE POLICY "Users can view contracts in their organization or platform admins"
ON public.contratos
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id(auth.uid())
  OR is_platform_admin(auth.uid())
);