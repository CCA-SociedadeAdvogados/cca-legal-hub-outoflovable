-- ============================================
-- MIGRAÇÃO: Suporte SSO, 2FA e Feature Flags
-- ============================================

-- 1. Adicionar novos campos à tabela profiles para suporte SSO e 2FA
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_method text DEFAULT 'local';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sso_provider text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sso_external_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_verified_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_attempts integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locked_until timestamptz;

-- 2. Criar tabela para feature flags
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  enabled boolean DEFAULT false,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS na tabela feature_flags
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública para feature flags (todos podem ver)
CREATE POLICY "Feature flags are readable by all authenticated users"
  ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

-- Política de escrita apenas para admins (via service role)
CREATE POLICY "Feature flags are editable by service role only"
  ON public.feature_flags
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Inserir feature flags iniciais
INSERT INTO public.feature_flags (name, enabled, description) VALUES
  ('ENABLE_SSO_CCA', false, 'Activar login SSO para utilizadores CCA'),
  ('ENABLE_2FA', false, 'Activar autenticação de dois factores')
ON CONFLICT (name) DO NOTHING;

-- 4. Criar tabela para logs de autenticação específicos
CREATE TABLE IF NOT EXISTS public.auth_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_method text NOT NULL DEFAULT 'local',
  action text NOT NULL,
  success boolean DEFAULT true,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS na tabela auth_activity_logs
ALTER TABLE public.auth_activity_logs ENABLE ROW LEVEL SECURITY;

-- Política: utilizadores podem ver os seus próprios logs
CREATE POLICY "Users can view their own auth logs"
  ON public.auth_activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Política: service role pode inserir logs
CREATE POLICY "Service role can insert auth logs"
  ON public.auth_activity_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Política: admins podem ver todos os logs da organização
CREATE POLICY "Admins can view all auth logs"
  ON public.auth_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE om.user_id = auth.uid()
        AND om.organization_id = p.current_organization_id
        AND om.role IN ('owner', 'admin')
    )
  );

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_profiles_auth_method ON public.profiles(auth_method);
CREATE INDEX IF NOT EXISTS idx_profiles_locked_until ON public.profiles(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_auth_activity_logs_user_id ON public.auth_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_activity_logs_created_at ON public.auth_activity_logs(created_at DESC);

-- 6. Trigger para actualizar updated_at em feature_flags
CREATE OR REPLACE FUNCTION public.update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER trigger_update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_feature_flags_updated_at();