-- Política para permitir membros verem perfis de colegas da mesma organização
CREATE POLICY "Members can view profiles of same organization"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR EXISTS (
      SELECT 1 
      FROM public.organization_members om1
      JOIN public.organization_members om2 ON om1.organization_id = om2.organization_id
      WHERE om1.user_id = auth.uid()
        AND om2.user_id = profiles.id
    )
  );

-- Remover política antiga que é agora redundante
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;