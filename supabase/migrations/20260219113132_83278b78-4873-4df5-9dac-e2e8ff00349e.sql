-- Fix assign_sso_user_to_organization to actually update the role on conflict
CREATE OR REPLACE FUNCTION public.assign_sso_user_to_organization(p_user_id uuid, p_organization_id uuid, p_role app_role DEFAULT 'editor'::app_role)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Upsert member with role update on conflict
  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (p_organization_id, p_user_id, p_role)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  
  -- Atualizar current_organization_id se não estiver definido
  UPDATE profiles
  SET current_organization_id = p_organization_id
  WHERE id = p_user_id 
    AND current_organization_id IS NULL;
  
  RETURN TRUE;
END;
$$;