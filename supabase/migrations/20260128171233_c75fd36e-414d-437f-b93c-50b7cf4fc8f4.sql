-- Remover política existente que exige autenticação
DROP POLICY IF EXISTS "Feature flags are readable by authenticated users" ON public.feature_flags;

-- Criar nova política que permite leitura pública (anon)
CREATE POLICY "Feature flags are readable by everyone"
ON public.feature_flags
FOR SELECT
TO public
USING (true);