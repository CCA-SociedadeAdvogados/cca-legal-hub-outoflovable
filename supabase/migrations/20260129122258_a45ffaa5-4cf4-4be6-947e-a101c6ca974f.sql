-- Adicionar politica para platform admins verem todos os profiles
CREATE POLICY "Platform admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() 
    OR is_platform_admin(auth.uid())
  );