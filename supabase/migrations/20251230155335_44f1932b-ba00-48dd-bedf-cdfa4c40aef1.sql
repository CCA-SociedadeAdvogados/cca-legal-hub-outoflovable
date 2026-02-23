-- Platform admins podem inserir novos platform admins
CREATE POLICY "Platform admins can insert platform admins"
ON public.platform_admins FOR INSERT
TO authenticated
WITH CHECK (is_platform_admin(auth.uid()));

-- Platform admins podem atualizar platform admins
CREATE POLICY "Platform admins can update platform admins"
ON public.platform_admins FOR UPDATE
TO authenticated
USING (is_platform_admin(auth.uid()));

-- Platform admins podem remover platform admins
CREATE POLICY "Platform admins can delete platform admins"
ON public.platform_admins FOR DELETE
TO authenticated
USING (is_platform_admin(auth.uid()));

-- Platform admins podem criar organizações
CREATE POLICY "Platform admins can insert organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (is_platform_admin(auth.uid()));

-- Platform admins podem apagar organizações
CREATE POLICY "Platform admins can delete organizations"
ON public.organizations FOR DELETE
TO authenticated
USING (is_platform_admin(auth.uid()));

-- Platform admins podem atualizar organizações
CREATE POLICY "Platform admins can update organizations"
ON public.organizations FOR UPDATE
TO authenticated
USING (is_platform_admin(auth.uid()));