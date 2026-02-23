-- Função SECURITY DEFINER para atribuir utilizadores SSO a organizações
-- Contorna RLS policies para operações administrativas do backend
CREATE OR REPLACE FUNCTION public.assign_sso_user_to_organization(
  p_user_id UUID,
  p_organization_id UUID,
  p_role app_role DEFAULT 'editor'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Inserir membro se não existir
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (p_organization_id, p_user_id, p_role)
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  
  -- Atualizar current_organization_id se não estiver definido
  UPDATE profiles
  SET current_organization_id = p_organization_id
  WHERE id = p_user_id 
    AND current_organization_id IS NULL;
  
  RETURN TRUE;
END;
$$;

-- Corrigir utilizadores SSO existentes que ficaram sem organização
INSERT INTO organization_members (organization_id, user_id, role)
SELECT 
  'e33bf0c9-71b9-491b-8054-d4c88d8bb4ee'::uuid, -- CCA_Teste
  p.id,
  'editor'::app_role
FROM profiles p
WHERE p.auth_method = 'sso_cca'
  AND NOT EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.user_id = p.id 
    AND om.organization_id = 'e33bf0c9-71b9-491b-8054-d4c88d8bb4ee'
  )
ON CONFLICT (organization_id, user_id) DO NOTHING;