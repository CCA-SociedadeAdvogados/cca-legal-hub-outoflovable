-- ============================================
-- FASE 1: Sistema de Impersonation + Home Configurável
-- ============================================

-- 1. Tabela de sessões de impersonation (auditoria completa)
CREATE TABLE public.impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  real_user_id uuid NOT NULL,
  impersonated_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(reason) >= 5),
  started_at timestamptz DEFAULT now() NOT NULL,
  ended_at timestamptz,
  ip_address text,
  user_agent text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at timestamptz DEFAULT now()
);

-- RLS para impersonation_sessions
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can manage impersonation sessions"
ON public.impersonation_sessions FOR ALL
USING (public.is_platform_admin(auth.uid()));

-- Índices para performance
CREATE INDEX idx_impersonation_sessions_real_user ON public.impersonation_sessions(real_user_id);
CREATE INDEX idx_impersonation_sessions_org ON public.impersonation_sessions(impersonated_organization_id);
CREATE INDEX idx_impersonation_sessions_status ON public.impersonation_sessions(status);

-- 2. Tabela de configuração da Home por organização
CREATE TABLE public.client_home_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid UNIQUE NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  layout_draft jsonb DEFAULT '{"widgets": [], "schemaVersion": 1}'::jsonb,
  layout_published jsonb,
  schema_version integer DEFAULT 1,
  updated_by_id uuid,
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz,
  published_by_id uuid,
  created_at timestamptz DEFAULT now()
);

-- RLS para client_home_config
ALTER TABLE public.client_home_config ENABLE ROW LEVEL SECURITY;

-- Membros da organização podem ler
CREATE POLICY "Members can read home config"
ON public.client_home_config FOR SELECT
USING (
  public.user_belongs_to_organization(organization_id, auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- Apenas platform admins podem escrever
CREATE POLICY "Platform admins can write home config"
ON public.client_home_config FOR INSERT
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update home config"
ON public.client_home_config FOR UPDATE
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can delete home config"
ON public.client_home_config FOR DELETE
USING (public.is_platform_admin(auth.uid()));

-- Índice
CREATE INDEX idx_client_home_config_org ON public.client_home_config(organization_id);

-- 3. Tabela de blocos de conteúdo custom por organização
CREATE TABLE public.client_content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content_key text NOT NULL,
  title text,
  content text,
  content_type text DEFAULT 'text' CHECK (content_type IN ('text', 'markdown', 'json', 'html')),
  media_refs jsonb DEFAULT '[]'::jsonb,
  updated_by_id uuid,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, content_key)
);

-- RLS para client_content_blocks
ALTER TABLE public.client_content_blocks ENABLE ROW LEVEL SECURITY;

-- Membros podem ler
CREATE POLICY "Members can read content blocks"
ON public.client_content_blocks FOR SELECT
USING (
  public.user_belongs_to_organization(organization_id, auth.uid())
  OR public.is_platform_admin(auth.uid())
);

-- Apenas platform admins podem escrever
CREATE POLICY "Platform admins can write content blocks"
ON public.client_content_blocks FOR INSERT
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update content blocks"
ON public.client_content_blocks FOR UPDATE
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can delete content blocks"
ON public.client_content_blocks FOR DELETE
USING (public.is_platform_admin(auth.uid()));

-- Índices
CREATE INDEX idx_client_content_blocks_org ON public.client_content_blocks(organization_id);
CREATE INDEX idx_client_content_blocks_key ON public.client_content_blocks(content_key);

-- 4. Adicionar campos de branding à tabela organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS lawyer_name text,
ADD COLUMN IF NOT EXISTS lawyer_photo_url text,
ADD COLUMN IF NOT EXISTS primary_color text,
ADD COLUMN IF NOT EXISTS secondary_color text,
ADD COLUMN IF NOT EXISTS custom_branding jsonb DEFAULT '{}'::jsonb;

-- 5. Criar bucket para assets de organização
INSERT INTO storage.buckets (id, name, public)
VALUES ('org-assets', 'org-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS para o bucket org-assets
CREATE POLICY "Anyone can read org assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'org-assets');

CREATE POLICY "Platform admins can upload org assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'org-assets'
  AND public.is_platform_admin(auth.uid())
);

CREATE POLICY "Platform admins can update org assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'org-assets'
  AND public.is_platform_admin(auth.uid())
);

CREATE POLICY "Platform admins can delete org assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'org-assets'
  AND public.is_platform_admin(auth.uid())
);