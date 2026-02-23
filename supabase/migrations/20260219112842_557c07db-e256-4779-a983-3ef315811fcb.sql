-- Allow service role to manage platform_admins (used by SSO edge function)
CREATE POLICY "Service role can manage platform_admins"
ON public.platform_admins
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');